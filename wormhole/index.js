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
		server.onMessage((event, resp) => {
			var msg = event.message;
			if (!msg) return;
			try {
				msg = msg.toBuffer().toString();
			}
			catch (err) {
				console.error('远端(' + event.sender.address + ':' + event.sender.port + ')发送信息解析失败：' + err.message);
				return;
			}
			var sender = event.sender;
			msg = msg.split(':');
			sender.id = msg.splice(0, 1)[0];
			var evt = msg.splice(0, 1)[0];
			msg = msg.join(':');
			var cb = Responsor[evt];
			if (!cb) console.log('::::::::::::::::::::::', evt, msg);
			if (!cb) return;
			cb(sender, msg, (msg, e, encrypt=false) => {
				e = e || ('respond-' + evt);
				msg = msg.toString();
				msg = global.NodeConfig.node.id + ':' + e + ':' + msg;
				msg = Uint8Array.fromString(msg);
				resp(msg);
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
		notOK = !result.ok;
		count --;
	}
	res(result);
});
Wormhole.sendToAddr = (conn, event, msg, encrypt=false) => new Promise(res => {
	Connection.client(async socket => {
		console.log('Send ' + event + '-msg To:', conn.ip, conn.port);
		msg = msg.toString();
		msg = global.NodeConfig.node.id + ':' + (event || 'message') + ':' + msg;
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