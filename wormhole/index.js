const Net = require('net');
const {UserTraffic} = require('./traffic');
const Responsor = require('./responsor');

const Wormhole = {};
const NodeMap = {};

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

Wormhole.init = port => new Promise(async res => {
	port = await Wormhole.createServer(port);
	res(port);
});
Wormhole.createServer = port => new Promise(res => {
	Wormhole.server = Net.createServer(remote => {
		var address = remote.remoteAddress;
		var ip4 = address.match(/\d+\.\d+\.\d+\.\d+/);
		if (!!ip4) address = ip4[0];
		var port = remote.remotePort;
		var user, conn;
		console.log('与远端建立连接:' + address + ':' + port);

		remote.on('data', msg => {
			msg = msg.toString();
			msg = msg.split(':');
			var len = msg.splice(0, 1) * 1;
			if (isNaN(len)) return;
			msg = msg.join(':');
			msg = msg.substring(0, len);
			msg = msg.split(':');
			var node = msg[0];
			var action = msg[1];
			msg = msg[2];
			if (!node || !action) return;
			user = NodeMap[node];
			if (!user) {
				user = new UserTraffic(node);
				NodeMap[node] = user;
			}
			user.record(address, port, true, len, true);
			conn = user.getConn(address).getConn(port);
			conn.socket = remote;
			remote.resList = remote.resList || [];
			if (!user.sockets.includes(conn)) user.sockets.push(conn);

			action = Responsor[action];
			if (!action) return;
			action(node, msg);
		});
		remote.on('error', err => {
			console.error('远端通道关闭 (' + address + ':' + port + ')');
			remote.end();
			if (!!remote.resList) remote.resList.forEach(res => res(false));
			delete remote.resList;

			conn.socket = undefined;
			user.sockets.remove(conn);
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
	await Promise.all(Object.keys(NodeMap).map(node => Wormhole.sendToNode(node, event, msg)));
	res();
});
Wormhole.sendToNode = (node, event, msg, encrypt=false) => new Promise(async res => {
	var conns = NodeMap[node];
	if (!conns) return res();
	var count = conns.getAll().length * 2;
	if (count === 0) return res();
	var notOK = true, done;

	msg = global.NodeConfig.node.id + ':' + (event || 'message') + ':' + msg;
	var msgLen = msg.length;
	msg = msgLen + ':' + msg;

	while (notOK && count > 0) {
		let conn = conns.choose(true);
		if (!conn) conn = conns.choose(false);
		console.log('>>>>>>>>>>>>>>>>>', conns.getAll().length, conn.weight);
		console.log('发送数据至 ' + conn.host + ':' + conn.port + ' (' + node + ')');
		done = await Wormhole.sendToAddr(conns, conn, msg, encrypt);
		conns.record(conn.host, conn.port, done, done ? msgLen : 0, false);
		notOK = !done;
		count --;
	}
	res(done);
});
Wormhole.sendToAddr = (info, conn, msg, encrypt=false) => new Promise(res => {
	var item = info.getConn(conn.host).getConn(conn.port);
	if (!!item.socket) {
		item.socket.resList.push(res);
		item.socket.write(msg, 'utf8', err => {
			console.log('step 1');
			if (!!err) {
				console.log('step 2');
				console.error('发送数据至 ' + conn.host + ':' + conn.port + ' 时出错：' + err.message);
				item.socket.end();
				if (!!item.socket.resList) item.socket.resList.forEach(res => res(false));
				delete item.socket.resList;
				item.socket = undefined;
				info.sockets.remove(item);
				return;
			}
			console.log('step 3');
			if (!item.socket || !item.socket.resList) return res(false);
			console.log('step 4');
			item.socket.resList.remove(res);
			res(true);
		});
		return;
	}

	var socket = Net.createConnection(conn.port, conn.host, () => {
		item.socket = socket;
		info.sockets.push(item);
		socket.write(msg, 'utf8', err => {
			console.log('step 5');
			if (!!err) {
				console.log('step 6');
				console.error('发送数据至 ' + conn.host + ':' + conn.port + ' 时出错：' + err.message);
				socket.end();
				if (!!socket.resList) socket.resList.forEach(res => res(false));
				delete socket.resList;
				item.socket = undefined;
				info.sockets.remove(item);
				return;
			}
			console.log('step 7');
			if (!socket.resList) return res(false);
			console.log('step 8');
			socket.resList.remove(res);
			res(true);
		});
	});
	socket.resList = [res];
	socket.on('data', msg => {
		msg = msg.toString();
		msg = msg.split(':');
		var len = msg.splice(0, 1) * 1;
		if (isNaN(len)) return;
		msg = msg.join(':');
		msg = msg.substring(0, len);
		msg = msg.split(':');
		var node = msg[0];
		var action = msg[1];
		msg = msg[2];
		if (!node || !action) return;
		info.record(conn.host, conn.port, true, len, true);
		action = Responsor[action];
		if (!action) return;
		action(node, msg);
	});
	socket.on('error', err => {
		console.error('通讯连接出错：' + err.message);
		socket.end();
		if (!!socket.resList) socket.resList.forEach(res => res(false));
		delete socket.resList;
		item.socket = undefined;
		info.sockets.remove(item);
	});
});
Wormhole.alohaKosmos = () => new Promise(async res => {
	var nodes = global.NodeManager.getNodeList();
	if (nodes.length === 0) return res();

	await Promise.all(nodes.map(node => Wormhole.shakeHand(node.id)));
	res();
});
Wormhole.shakeHand = node => new Promise(async res => {
	var conns;
	try {
		conns = await IPFS.getConnections(node);
	}
	catch (err) {
		console.error('查询节点(' + node + ')可用连接失败：' + err.message);
		delayAction.push(['shakeHand', node]);
		setTimeout(delayHandler, 1000 * 30);
		res();
		return;
	}
	console.log('发现节点(' + node + ')的可用连接(' + conns.length + '个)');

	conns.forEach(item => item.port += 4100);

	var traffic = NodeMap[node];
	if (!traffic) {
		traffic = new UserTraffic(node);
		NodeMap[node] = traffic;
		conns.forEach(conn => {
			traffic.prepare(conn.ip, conn.port);
		});
	}
	else {
		traffic.getAll().forEach(conn => {
			traffic.record(conn.ip, conn.port, false, 0, true);
		});
		conns.forEach(conn => {
			var c = traffic.conns[conn.ip];
			if (!!c) c = c.conns[conn.port];
			if (!!c) traffic.record(conn.ip, conn.port, true, 0, true);
			else traffic.prepare(conn.ip, conn.port);
		});
	}

	await Wormhole.sendToNode(node, 'shakehand', global.NodeConfig.hash);
	res();
});

global.Wormhole = Wormhole;