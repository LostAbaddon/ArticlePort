const RequestList = new Map();
_('Wormhole.Requests', RequestList);

const Net = require('net');
const crypto = require("crypto");
const {UserTraffic, ConnManager} = require('./traffic');
const keyUtil = require('./keyUtils');
const Responsor = require('./responsor');
const Message = require('./message');
require('../core/datastore/lrucache');
const LRUCache = _('DataStore.LRUCache');

const Wormhole = {};
const NodeMap = {};
const ReAlohaDelay = 1000 * 60 * 3;
const ReplyDelay = 1000 * 60 * 5;
const ReceiveWindow = 1000 * 60 * 10;
const MessageHistory = new LRUCache(1000);

var timerAloha = null;
var started = false;
var bootstrapList = [];

const delayAction = [];
const delayHandler = () => {
	var list = delayAction.splice(0, delayAction.length);
	list.forEach(action => {
		if (Array.isArray(action)) {
			let cb = action.splice(0, 1);
			cb = Wormhole[action];
			if (!cb) return;
			cb(...action);
		}
		else {
			let cb = Wormhole[action];
			if (!cb) return;
			cb();
		}
	});
};

const parseMessage = msg => new Promise(async res => {
	try {
		msg = msg.toString();
		msg = JSON.parse(msg);
	}
	catch {
		return res(null);
	}
	if (MessageHistory.has(msg.mid)) return res(null);
	MessageHistory.set(msg.mid, msg.stamp);

	var m = new Message();
	m.mid = msg.mid;
	m.sign = msg.sign;
	m.sender = msg.sender;
	m.stamp = msg.stamp;
	m.event = msg.event;
	m.message = msg.message;
	var pubkey = keyUtil.getPubKey(m.sender);
	if (!pubkey) {
		let msg = new Message();
		msg.event = 'requestPublicKey';
		msg.message = m.sender;
		msg.type = 2;
		msg.target = m.sender;
		let [keys, err] = await Wormhole.request(msg, false, m.sender, 1, ReplyDelay);
		if (!!keys && Object.keys(keys).length > 0) {
			pubkey = Object.keys[keys][0];
			pubkey = keys[pubkey];
			if (!!pubkey) keyUtil.setPubKey(m.sender, pubkey);
		}
	}
	if (!m.verify(pubkey)) return res(null);
	return res(m);
});
const dealMessage = async msg => {
	var node = msg.sender;
	var action = msg.event;
	if (!node || !action) return;
	if (msg.stamp < Date.now() - ReceiveWindow) return;

	var message = msg.message;
	action = Responsor[action];
	if (!action) return;
	var done = await action(node, message, msg);
	if (done) return;

	if (msg.type === 1) {
		Wormhole.broadcast(msg, null);
	}
	else if (msg.type === 2 && msg.target !== global.NodeConfig.node.id) {
		Wormhole.narrowcast(msg.target, msg, null);
	}
};

Wormhole.init = (port, bootstraps) => new Promise(async res => {
	await keyUtil.init();

	var pubkey = await IPFS.getNodeInfo();
	if (!pubkey || !pubkey.PublicKey) {
		console.error('获取本地公钥失败！');
		return res(0);
	}

	global.Keys = {};
	global.Keys.priv = crypto.createPrivateKey({
		key: keyUtil.unmarshal(global.NodeConfig.node.key),
		format: 'der',
		type: 'pkcs1'
	});
	global.Keys.card = pubkey.PublicKey;
	global.Keys.pub = crypto.createPublicKey({
		key: keyUtil.unmarshal(pubkey.PublicKey),
		format: 'der',
		type: 'spki'
	});

	(bootstraps || []).forEach(item => {
		item = item.split('/');
		if (item.length !== 2) return;
		item[1] = item[1] * 1;
		if (isNaN(item[1])) return;
		var conn = new UserTraffic(item[0], item[1]);
		conn.prepare(item[0], item[1]);
		conn.host = item[0];
		conn.port = item[1];
		bootstrapList.push(conn);
	});
	port = await Wormhole.createServer(port);
	started = true;
	res(port);
});
Wormhole.getIDCard = () => {
	if (!global.Keys) return null;
	var msg = new Message();
	var self = global.NodeManager.getSelfInfo();
	msg.stamp = self.signin;
	msg.sender = global.NodeConfig.node.id;
	msg.event = 'shakehand';
	msg.message = {
		hash: global.NodeConfig.hash,
		key: global.Keys.card,
		port: global.NodeConfig.node.publicPort
	};
	return msg;
};
Wormhole.createServer = port => new Promise(res => {
	Wormhole.server = Net.createServer(remote => {
		var address = remote.remoteAddress;
		var ip4 = address.match(/\d+\.\d+\.\d+\.\d+/);
		if (!!ip4) address = ip4[0];
		var port = remote.remotePort;
		var user, conn;
		console.log('与远端建立连接:' + address + ':' + port);

		remote.on('data', async msg => {
			var len = msg.length;
			msg = await parseMessage(msg);
			if (!msg) return;

			user = NodeMap[msg.sender];
			if (!user) {
				user = new UserTraffic(msg.sender);
				NodeMap[msg.sender] = user;
			}
			user.record(address, port, true, len, true);
			conn = user.getConn(address).getConn(port);
			conn.socket = remote;
			remote.resList = remote.resList || [];
			if (!user.sockets.includes(conn)) user.sockets.push(conn);
			ConnManager.add(conn);

			dealMessage(msg);
		});
		remote.on('error', err => {
			console.error('远端通道关闭 (' + address + ':' + port + '): ' + err.message);
			remote.end();
		});
		remote.on('close', () => {
			if (!!remote.resList) remote.resList.forEach(res => res(false));
			delete remote.resList;
			if (!conn) return;

			conn.socket = undefined;
			user.sockets.remove(conn);
			ConnManager.del(conn);
		});
	});
	Wormhole.server.on('error', err => {
		console.error('>>>> TCP 服务出错 <<<<');
		console.error(err);
		delayAction.push('createServer');
		setTimeout(delayHandler, 1000);
	});
	// 绑定监听端口
	Wormhole.server.listen(port, () => {
		port = Wormhole.server.address().port;
		console.log('星门开启端口：' + port);
		res(port);
	});
});
Wormhole.broadcast = (event, msg, encrypt=false) => new Promise(async res => {
	if (!started) return res();

	if (event instanceof Message) {
		if (msg === true) event.generate(global.Keys.priv);
		else if (msg === false) event.generate();
		MessageHistory.set(event.mid, event.stamp);
		msg = JSON.stringify(event);
	}
	else {
		let m = new Message();
		m.event = event;
		m.message = msg;
		if (encrypt === true) m.generate(global.Keys.priv);
		else if (encrypt === false) m.generate();
		MessageHistory.set(m.mid, m.stamp);
		msg = JSON.stringify(m);
		m = null;
	}

	await Promise.all(Object.keys(NodeMap).map(node => Wormhole.sendToNode(node, msg)));
	res();
});
Wormhole.narrowcast = (target, event, msg=false, encrypt=false, limit=1) => new Promise(async res => {
	if (!started) return res();

	if (event instanceof Message) {
		if (msg === true) event.generate(global.Keys.priv);
		else if (msg === false) event.generate();
		MessageHistory.set(event.mid, event.stamp);
		msg = JSON.stringify(event);
	}
	else {
		let m = new Message();
		m.event = event;
		m.message = msg;
		if (encrypt === true) m.generate(global.Keys.priv);
		else if (encrypt === false) m.generate();
		MessageHistory.set(m.mid, m.stamp);
		msg = JSON.stringify(m);
		m = null;
	}

	var nodeList = [];

	if (!!NodeMap[node]) {
		nodeList.push(node);
	}
	else {
		let l = keyUtil.getPosition(target);
		for (let n in NodeMap) {
			let m = keyUtil.getPosition(n);
			m = keyUtil.getDistance(l, m);
			if (m <= keyUtil.limitRange) {
				nodeList.push(n);
			}
		}
		if (isNaN(limit)) limit = 1;
		if (nodeList.length < limit) {
			nodeList = [];
			for (let n in NodeMap) nodeList.push(n);
		}
	}

	await Promise.all(nodeList.map(node => Wormhole.sendToNode(node, msg)));
	res();
});
Wormhole.getAddressList = (node, port=null) => new Promise(async res => {
	var conns;
	try {
		conns = await IPFS.getConnections(node);
	}
	catch (err) {
		console.error('查询节点(' + node + ')可用连接失败：' + err.message);
		return res(false);
	}
	if (!conns) return res(false);
	console.log('发现节点(' + node + ')的可用连接(' + conns.length + '个)');
	if (conns.length === 0) return res(false);
	conns.forEach(item => item.port += 4100);

	if (isNaN(port) || port === null) {
		port = -1;
		let hash;
		try {
			hash = await IPFS.resolve(global.NodeConfig.node.id);
			let path = await IPFS.downloadFolder(node, hash);
			let remoteInfo = await getJSON(Path.join(path, 'personel.json'));
			if (!!remoteInfo) port = remoteInfo.publicPort;
		} catch {}
	}

	var traffic = NodeMap[node];
	if (!traffic) {
		traffic = new UserTraffic(node, port);
		NodeMap[node] = traffic;
		conns.forEach(conn => {
			traffic.prepare(conn.ip, conn.port);
		});
	}
	else {
		traffic.changePublicPort(port);
		traffic.getAll().forEach(conn => {
			traffic.record(conn.host, conn.port, false, 0, true);
		});
		conns.forEach(conn => {
			var c = traffic.conns[conn.ip];
			if (!!c) c = c.conns[conn.port];
			if (!!c) traffic.record(conn.ip, conn.port, true, 0, true);
			else traffic.prepare(conn.ip, conn.port);
		});
	}
	res(true);
});
Wormhole.sendToNode = (node, msg) => new Promise(async res => {
	if (!started) return res(false);

	var conns = NodeMap[node], count = 0;
	if (!!conns) count = conns.getAll().length * 2;
	if (count === 0) {
		let ok = await Wormhole.getAddressList(node);
		if (!ok) return res(false);
	}

	var notOK = true, done;
	var msgLen = msg.length;
	while (notOK && count > 0) {
		let conn = conns.choose(true);
		if (!conn) conn = conns.choose(false);
		console.log('发送数据至 ' + conn.host + ':' + conn.port + ' (' + node + ')');
		done = await Wormhole.sendToAddr(conns, conn, msg);
		conns.record(conn.host, conn.port, done, done ? msgLen : 0, false);
		notOK = !done;
		count --;
	}
	res(done);
});
Wormhole.sendToAddr = (info, conn, msg) => new Promise(res => {
	if (!started) return res(false);

	ConnManager.closeOverCount(global.NodeConfig.connectionLimit);

	var item = info.getConn(conn.host).getConn(conn.port);
	if (!!item.socket) {
		item.socket.resList.push(res);
		item.socket.write(msg, 'utf8', err => {
			if (!!err) {
				console.error('发送数据至 ' + conn.host + ':' + conn.port + ' 时出错：' + err.message);
				item.socket.end();
				if (!!item.socket.resList) item.socket.resList.forEach(res => res(false));
				delete item.socket.resList;
				item.socket = undefined;
				info.sockets.remove(item);
				ConnManager.del(item);
				return;
			}
			if (!item.socket || !item.socket.resList) return res(false);
			item.socket.resList.remove(res);
			res(true);
		});
		return;
	}

	var socket = Net.createConnection(conn.port, conn.host, () => {
		item.socket = socket;
		info.sockets.push(item);
		ConnManager.add(item);
		socket.write(msg, 'utf8', err => {
			if (!!err) {
				console.error('发送数据至 ' + conn.host + ':' + conn.port + ' 时出错：' + err.message);
				socket.end();
				if (!!socket.resList) socket.resList.forEach(res => res(false));
				delete socket.resList;
				item.socket = undefined;
				info.sockets.remove(item);
				ConnManager.del(item);
				return;
			}
			if (!socket.resList) return res(false);
			socket.resList.remove(res);
			res(true);
		});
	});
	socket.resList = [res];
	socket.on('data', async msg => {
		var len = msg.length;
		msg = await parseMessage(msg);
		if (!msg) return;

		if (!!msg.sender && !!msg.event) info.record(conn.host, conn.port, true, len, true);
		dealMessage(msg);
	});
	socket.on('error', err => {
		console.error('通讯连接出错：' + err.message);
		socket.end();
	});
	socket.on('close', () => {
		if (!!socket.resList) socket.resList.forEach(res => res(false));
		delete socket.resList;
		if (!item) return;

		item.socket = undefined;
		info.sockets.remove(item);
		ConnManager.del(item);
	});
});
Wormhole.alohaKosmos = () => new Promise(async res => {
	if (!!timerAloha) {
		clearTimeout(timerAloha);
		timerAloha = null;
	}
	var nodes = global.NodeManager.getNodeList();
	if (nodes.length === 0) return res();

	var msg = Wormhole.getIDCard().copy();
	msg.generate();
	msg = JSON.stringify(msg);

	var actions = nodes.map(node => Wormhole.shakeHand(node.id, node.port, msg));
	actions.push(Wormhole.shakeHand2Bootstraps());
	await Promise.all(actions);
	res();

	if (!!timerAloha) clearTimeout(timerAloha);
	timerAloha = setTimeout(Wormhole.alohaKosmos, ReAlohaDelay);
});
Wormhole.shakeHand = (node, port, msg) => new Promise(async res => {
	var ok = await Wormhole.getAddressList(node, port);
	if (!ok) return res();
	await Wormhole.sendToNode(node, msg);
	res();
});
Wormhole.shakeHand2Bootstraps = msg => new Promise(async res => {
	var actions = bootstrapList.map(conn => {
		console.log('连接到入口节点 (' + conn.host + ':' + conn.port + ')');
		return Wormhole.sendToAddr(conn, conn, msg);
	});
	await Promise.all(actions);
	res();
});
Wormhole.request = (msg, encrypt, target, limit=1, timeout=ReplyDelay) => new Promise(res => {
	if (encrypt) msg.generate(global.Keys.priv);
	else msg.generate();
	var mid = msg.mid;
	RequestList.set(mid, [res, limit, {}, timeout, Date.now(), setTimeout(() => {
		var item = RequestList.get(mid);
		if (!item) return;
		item[0]([item[2], new Error('响应超时')]);
		RequestList.delete(mid);
	}, timeout)]);
	if (!!target) Wormhole.narrowcast(target, msg);
	else Wormhole.broadcast(msg);
});

global.Wormhole = Wormhole;