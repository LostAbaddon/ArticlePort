const Connection = require('../core/connection');

var server;
const Wormhole = {};
const NodeMap = {};
Wormhole.init = port => new Promise((res, rej) => {
	// 初始化 TCP 连接服务端
	Connection.server('tcp', port, (svr, err) => {
		if (!!err) return rej(err);
		server = svr;
		console.log('虫洞网络启动：' + server.port);
		server.onMessage(event => {
			var msg = event.message;
			if (!msg) return;
			try {
				msg = msg.toBuffer().toString();
			}
			catch (err) {
				console.error('远端(' + event.sender.address + ':' + event.sender.port + ')发送信息解析失败：' + err.message);
				return;
			}
			msg = msg.split(':');
			var evt = msg.splice(0, 1);
			msg = msg.join(':');
			console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
			console.log(evt, msg);
		});

		global.NodeConfig.node.port = server.port;
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
Wormhole.alohaKosmos = () => new Promise(async res => {
	var nodes = global.NodeManager.getNodeList();
	var count = nodes.length;
	if (count === 0) return res();

	nodes.forEach(async node => {
		node = node.id;
		var conns;
		try {
			conns = await IPFS.getConnections(node);
		} catch {}
		if (!!conns && conns.length > 0) {
			conns.forEach(conn => {
				conn.weight = 0;
				conn.port += 4100;
			});
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
	console.log(conns);
	var conn = conns[0];
	conns.some(c => {
		if (c.ip.indexOf('192.') >= 0) {
			conn = c;
			return true;
		}
	});
	Connection.client(async socket => {
		console.log('Say Hello To:', conn.ip, conn.port, node);
		var respond = await socket.sendMessage(conn.ip, conn.port, 'tcp', Uint8Array.fromString('ShakeHand:' + global.NodeConfig.node.id));
		console.log('Got Respond:', respond);
	});
});

global.Wormhole = Wormhole;