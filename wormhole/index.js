const Connection = require('../core/connection');
const Responsor = require('./responsor');

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
			var evt = msg.splice(0, 1)[0];
			msg = msg.join(':');
			console.log('~~~~~~~~~~~~~~~~~~', evt, msg);
			var cb = Responsor[evt];
			if (!!cb) return;
			cb(msg, (msg, e) => {
				e = e || ('respond-' + evt);
				Wormhole.sendToAddr({
					ip: event.sender.address,
					port: event.sender.port,
					weight: 0
				}, e, msg);
			});
		});

		global.NodeConfig.node.port = server.port;
		res();
	});
});
Wormhole.broadcast = (event, msg, encrypt=false) => new Promise(res => {
	res();
});
Wormhole.sendToNode = (node, event, msg, encrypt=false) => new Promise(async res => {
	var conns = NodeMap[node];
	if (!conns || conns.length === 0) return res();
	console.log(node, conns);
	var notOK = true, conn, result, count = conns.length * 2;
	while (notOK && count > 0) {
		conns.sort((ca, cb) => {
			var diff = cb.weight - ca.weight;
			if (diff === 0) diff = Math.random() - 0.5;
			return diff;
		});
		conn = conns[0];
		console.log('::::', node, conn.ip, conn.port);
		result = await Wormhole.sendToAddr(conn, event, msg, encrypt);
		console.log("    ", result)
		notOK = result.ok;
		count --;
	}
	res(result);
});
Wormhole.sendToAddr = (conn, event, msg, encrypt=false) => new Promise(res => {
	Connection.client(async socket => {
		console.log('Send ' + event + '-msg To:', conn.ip, conn.port);
		msg = msg.toString();
		msg = (event || 'message') + ':' + msg;
		var respond = await socket.sendMessage(conn.ip, conn.port, 'tcp', Uint8Array.fromString(msg));
		if (respond.ok) {
			conn.weight ++;
		}
		else {
			conn.weight --;
		}
		res(respond);
	});
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
Wormhole.shakeHand = node => new Promise(async res => {
	await Wormhole.sendToNode(node, 'shakehand', global.NodeConfig.node.id);
	res();
});

global.Wormhole = Wormhole;