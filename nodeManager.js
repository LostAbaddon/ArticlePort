const Path = require('path');
const FS = require('fs');

const Manager = {};
const nodeList = {};
var connectionFilepath = '';
var personelFilepath = '';
var storagePath = '';

const updateConnectionsAndPublish = () => new Promise((res, rej) => {
	FS.writeFile(connectionFilepath, JSON.stringify(nodeList), 'utf8', async (err) => {
		if (!!err) {
			rej(err);
		}
		else {
			await saveAndPublish();
			res();
		}
	});
});
const saveAndPublish = () => new Promise(async res => {
	var hash = await IPFS.uploadFolder(storagePath);
	console.log('更新内容星站：' + hash);
	res();
	hash = await IPFS.publish(hash);
	console.log('星站内容已更新！', hash);
});

Manager.init = () => new Promise(res => {
	storagePath = Path.join(process.cwd(), global.NodeConfig.storage);

	connectionFilepath = Path.join(storagePath, 'connection.json');
	var json;
	try {
		json = require(connectionFilepath);
	}
	catch {
		json = {};
	}
	Object.keys(json).forEach(id => {
		nodeList[id] = json[id];
		IPFS.subscribe(id);
	});

	personelFilepath = Path.join(storagePath, 'personel.json');
	FS.readFile(personelFilepath, 'utf8', async (err, data) => {
		if (!!err || !data) {
			json = {};
			json.signup = Date.now();
		}
		else {
			json = JSON.parse(data.toString());
			if (!json.signup) json.signup = Date.now();
		}
		json.name = global.NodeConfig.name;
		json.id = global.NodeConfig.node.id;
		json.signin = Date.now();
		await saveAndPublish();
		res();
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

	updateConnectionsAndPublish();
	IPFS.subscribe(node);
});
Manager.removeNode = node => new Promise((res, rej) => {
	var old = !!nodeList[node];
	if (!old) return res();
	delete nodeList[node];

	updateConnectionsAndPublish();
	IPFS.unsubscribe(node);
});
Manager.changeNodeName = (node, name) => new Promise(res => {
	var old = nodeList[node];
	if (old === name) return res();
	nodeList[node] = name;

	updateConnectionsAndPublish();
});

global.NodeManager = Manager;