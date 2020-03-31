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
	var hash;
	try {
		hash = await IPFS.uploadFolder(storagePath);
	}
	catch (err) {
		console.error('更新目录失败：' + err.message);
		return;
	}
	console.log('更新内容星站：' + hash);
	res();
	try {
		hash = await IPFS.publish(hash);
	}
	catch (err) {
		console.error('发布更新失败：' + err.message);
		return;
	}
	console.log('星站内容已更新！', hash);
});

Manager.init = () => new Promise(async (res, rej) => {
	storagePath = Path.join(process.cwd(), global.NodeConfig.storage);
	var prepare = _("Utils").preparePath;
	await prepare(storagePath);

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
	FS.readFile(personelFilepath, 'utf8', (err, data) => {
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
		FS.writeFile(personelFilepath, JSON.stringify(json), 'utf8', async err => {
			if (!!err) {
				rej(err);
				return;
			}
			await saveAndPublish();
			res();
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
Manager.changeNodeName = (node, name) => new Promise(async res => {
	var old = nodeList[node];
	if (old === name) return res();
	nodeList[node] = name;

	await updateConnectionsAndPublish();
	res();
});
Manager.getNodeName = node => {
	if (node === global.NodeConfig.node.id) return global.NodeConfig.name;
	return nodeList[node] || '佚名'
};

global.NodeManager = Manager;