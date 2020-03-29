const Path = require('path');
const FS = require('fs');

const Manager = {};
const nodeList = {};
var filepath = '';
var storagePath = '';

Manager.init = () => new Promise(res => {
	storagePath = Path.join(process.cwd(), global.NodeConfig.storage);

	filepath = Path.join(process.cwd(), global.NodeConfig.storage, 'connection.json');
	var json;
	try {
		json = require(filepath);
	}
	catch {
		json = {};
	}
	Object.keys(json).forEach(id => {
		nodeList[id] = json[id];
		IPFS.subscribe(id);
	});

	filepath = Path.join(process.cwd(), global.NodeConfig.storage, 'personel.json');
	FS.readFile(filepath, 'utf8', (err, data) => {
		if (!!err || !data) {
			json = {};
			json.signup = Date.now();
		}
		else {
			json = JSON.parse(data.toString());
		}
		json.name = global.NodeConfig.name;
		json.id = global.NodeConfig.node.id;
		json.signin = Date.now();
		FS.writeFile(filepath, JSON.stringify(json), 'utf8', async () => {
			var hash = await IPFS.uploadFolder(storagePath);
			console.log('更新内容星站：' + hash);
			res();
			hash = await IPFS.publish(hash);
			console.log('星站内容已更新！', hash);
		});
	});
});
Manager.getNodeList = () => {
	return Object.keys(nodeList).map(id => {
		return { name: nodeList[id], id };
	});
};
Manager.addNode = node => new Promise((res, rej) => {
	var old = !!nodeList[node];
	if (old) return res();
	nodeList[node] = node;

	FS.writeFile(filepath, JSON.stringify(nodeList), 'utf8', async (err) => {
		if (!!err) {
			rej(err);
		}
		else {
			let hash = await IPFS.uploadFolder(storagePath);
			console.log('更新内容星站：' + hash);
			res();
			hash = await IPFS.publish(hash);
			console.log('星站内容已更新！', hash);
		}
	});

	IPFS.subscribe(node);
});
Manager.removeNode = node => new Promise((res, rej) => {
	var old = !!nodeList[node];
	if (!old) return res();
	delete nodeList[node];

	FS.writeFile(filepath, JSON.stringify(nodeList), 'utf8', async (err) => {
		if (!!err) {
			rej(err);
		}
		else {
			let hash = await IPFS.uploadFolder(storagePath);
			console.log('更新内容星站：' + hash);
			res();
			hash = await IPFS.publish(hash);
			console.log('星站内容已更新！', hash);
		}
	});

	IPFS.unsubscribe(node);
});

global.NodeManager = Manager;