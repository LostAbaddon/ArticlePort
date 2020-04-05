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
	var notOK = true, result;
	while (notOK && count > 0) {
		let conn = conns.choose();
		console.log('::::', node, conn.ip, conn.port);
		result = await Wormhole.sendToAddr(conn, event, msg, encrypt);
		console.log("    ", result)
		notOK = !result.ok;
		count --;
	}
	res(result);
});
Wormhole.sendToAddr = (conn, event, msg, encrypt=false) => new Promise(res => {
	console.log('Send ' + event + '-msg To:', conn.host, conn.port);
	Net.createConnection(conn.port, conn.host, (...args) => {
		console.log('xxxxxxxxxxxxxxxxxxx', args);
	});
	return;

	Connection.client(async socket => {
		msg = msg.toString();
		msg = global.NodeConfig.node.id + ':' + (event || 'message') + ':' + msg;
		var respond = await socket.sendMessage(conn.host, conn.port, 'tcp', Uint8Array.fromString(msg));
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

	var traffic = NodeMap[node];
	if (!traffic) {
		traffic = new UserTraffic();
		NodeMap[node] = traffic;
	}
	else {
		traffic.getAll().forEach(conn => {
			traffic.record(conn.host, conn.port, false, 0, true);
		});
		conns.forEach(conn => {
			traffic.record(conn.ip, conn.port, true, 0, true);
		});
	}

	await Wormhole.sendToNode(node, 'shakehand', global.NodeConfig.node.id);
	res();
});

global.Wormhole = Wormhole;