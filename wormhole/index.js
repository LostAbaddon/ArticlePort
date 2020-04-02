const Connection = require('../core/connection');

var server;
const Wormhole = {};
const NodeMap = {};
Wormhole.init = port => new Promise((res, rej) => {
	// 初始化 TCP 连接服务端
	Connection.server('tcp', port, (svr, err) => {
		if (!!err) return rej(err);
		server = svr;
		server.onMessage((...args) => {
			console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
			console.log(args);
		});

		res();
	});
});
Wormhole.broadcast = msg => new Promise(res => {
	res();
});
Wormhole.sendToNode = (cid, msg) => new Promise(res => {
	res();
});
Wormhole.sendToAddr = (ip, port, msg) => new Promise(res => {
	res();
});
Wormhole.alohaKosmos = () => new Promise(res => {
	var nodes = global.NodeManager.getNodeList();
	var count = nodes.length;
	if (count === 0) return res();

	nodes.forEach(async node => {
		var conns;
		try {
			conns = await IPFS.getConnections(node.id);
		} catch {}
		if (!!conns && conns.length > 0) {
			conns.forEach(conn => conn.weight = 0);
			NodeMap[node] = conns;
			Wormhole.shakeHand(node);
		}
		count --;
		if (count === 0) {
			res();
		}
	});
});
Wormhole.shakeHand = node => new Promise(res => {
	var conns = NodeMap[node];
	if (!conns || conns.length === 0) return res();
	conns.sort((ca, cb) => {
		var diff = cb.weight - ca.weight;
		if (diff === 0) diff = Math.random() - 0.5;
		return diff;
	});
	var conn = conns[0];
	Connection.client(async socket => {
		var respond = await socket.sendMessage(conn.ip, conn.port, 'tcp', 'ShakeHand');
		console.log('Got Respond:', respond);
	});
});

global.Wormhole = Wormhole;