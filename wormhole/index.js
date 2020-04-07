const Net = require('net');
const {UserTraffic} = require('./traffic');
const Responsor = require('./responsor');

const Wormhole = {};
const NodeMap = {};

const delayAction = [];
const delayHandler = () => {
	var list = delayAction.splice(0, delayAction.length);
	list.forEach(action => {
		var cb = Wormhole[action];
		if (!cb) return;
		cb();
	});
};

Wormhole.init = port => new Promise(async res => {
	port = await Wormhole.createServer(port);
	res(port);
});
Wormhole.createServer = port => new Promise(res => {
	Wormhole.server = Net.createServer((...args) => {
		console.log('On Connect:', args);
	});
	Wormhole.server.on('error', err => {
		console.error('>>>> TCP 服务出错 <<<<');
		console.error(err);
		delayAction.push('createServer');
		Wormhole.timer(delayHandler, 1000);
	});
	// 绑定监听端口
	Wormhole.server.listen(port, () => {
		port = Wormhole.server.address().port;
		console.log('星门开启端口：' + port);
		res(port);
	});
});
Wormhole.broadcast = (event, msg, encrypt=false) => new Promise(res => {
	res();
});
Wormhole.sendToNode = (node, event, msg, encrypt=false) => new Promise(async res => {
	var conns = NodeMap[node];
	if (!conns) return res();
	var count = conns.getAll().length;
	if (count === 0) return res();
	var notOK = true, done;

	msg = global.NodeConfig.node.id + ':' + (event || 'message') + ':' + msg;
	msg = Uint8Array.fromString(msg);
	var msgLen = msg.length;

	while (notOK && count > 0) {
		let conn = conns.choose(true);
		if (!conn) conn = conns.choose(false);
		console.log('====================================');
		console.log(conns.sockets);
		console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
		console.log(conns.getAll());
		console.log('::::', node, conn.host, conn.port);
		done = await Wormhole.sendToAddr(conns, conn, msg, encrypt);
		conns.record(conn.host, conn.port, done, msgLen, false);
		console.log("    ", done);
		notOK = !done;
		count --;
	}
	res(done);
});
Wormhole.sendToAddr = (info, conn, msg, encrypt=false) => new Promise(res => {
	var item = info.getConn(conn.host).getConn(conn.port);
	if (!!item.socket) {
		item.socket.resList.push(res);
		item.socket.write(Uint8Array.fromString(msg), (...args) => {
			console.log('xxxxxxxx   1', args);
			item.socket.resList.remove(res);
			res(true);
		});
		return;
	}

	var socket = Net.createConnection(conn.port, conn.host, () => {
		item.socket = socket;
		socket.resList = [res];
		info.sockets.push(item);
		socket.on('error', err => {
			console.error('通讯连接出错：' + err.message);
			socket.end();
			info.sockets.remove(item);
			item.socket = undefined;
			if (!!socket.resList) socket.resList.forEach(res => res(false));
			delete socket.resList;
		});
		socket.write(msg, (...args) => {
			console.log('xxxxxxxx   2', args);
			socket.resList.remove(res);
			res(true);
		});
	});
	socket.on('error', err => {
		console.error('通讯连接出错：' + err.message);
		socket.end();
		info.sockets.remove(item);
		item.socket = undefined;
		if (!!socket.resList) socket.resList.forEach(res => res(false));
		delete socket.resList;
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
		res();
		return;
	}
	console.log('发现节点(' + node + ')的可用连接(' + conns.length + '个)');

	conns.forEach(item => item.port += 4100);

	var traffic = NodeMap[node];
	if (!traffic) {
		traffic = new UserTraffic();
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

	await Wormhole.sendToNode(node, 'shakehand', global.NodeConfig.node.id);
	res();
});

global.Wormhole = Wormhole;