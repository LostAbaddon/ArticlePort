const Path = require('path');
const FS = require('fs');
const getJSON = _('Utils.getJSON');
const saveFile = _('Utils.saveFile');
const prepare = _("Utils").preparePath;

const Manager = {};
const SelfInfo = {};
var configFilepath = '';
var storagePath = '';

const saveAndPublish = (needSave=true) => new Promise(async res => {
	if (needSave) {
		SelfInfo.signin = Date.now();
		try {
			await saveFile(configFilepath, JSON.stringify(SelfInfo));
		}
		catch (err) {
			console.error('保存节点信息时出错：' + err.message);
			return;
		}
	}

	var hash;
	try {
		hash = await IPFS.uploadFolder(storagePath);
	}
	catch (err) {
		console.error('更新目录失败：' + err.message);
		return;
	}
	console.log('更新内容星站：' + hash);
	global.NodeConfig.hash = hash;
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
	configFilepath = Path.join(storagePath, 'personel.json');

	var json;
	[, json] = await Promise.all([
		prepare(storagePath),
		getJSON(configFilepath)
	]);

	SelfInfo.id = global.NodeConfig.node.id;
	SelfInfo.name = global.NodeConfig.name;
	SelfInfo.signup = json.signup || SelfInfo.signin;
	SelfInfo.port = global.NodeConfig.node.port;
	SelfInfo.connections = json.connections || {};

	Object.keys(SelfInfo.connections).forEach(id => {
		IPFS.subscribe(id);
	});

	try {
		await saveAndPublish(false);
	}
	catch (err) {
		console.error('保存并发布信息时出错：' + err.message);
	}
	res();
});
Manager.getNodeList = () => {
	return Object.keys(SelfInfo.connections || {}).map(id => {
		return { name: SelfInfo.connections[id], id };
	});
};
Manager.addNode = node => new Promise(async (res, rej) => {
	var old = !!SelfInfo.connections[node];
	if (old) return res();
	SelfInfo.connections[node] = node;

	IPFS.subscribe(node);
	try {
		await saveAndPublish();
	}
	catch (err) {
		console.error('添加节点（' +  node + '）时：' + err.message);
	}
	res();
});
Manager.removeNode = node => new Promise(async (res, rej) => {
	var old = !!SelfInfo.connections[node];
	if (!old) return res();
	delete SelfInfo.connections[node];

	IPFS.unsubscribe(node);
	try {
		await saveAndPublish();
	}
	catch (err) {
		console.error('删除节点（' +  node + '）时：' + err.message);
	}
	res();
});
Manager.changeNodeName = (node, name) => new Promise(async res => {
	var old = SelfInfo.connections[node];
	if (old === name) return res();
	SelfInfo.connections[node] = name;

	try {
		await saveAndPublish();
	}
	catch (err) {
		console.error('修改节点名（' + node + '）字时出错：' + err.message);
	}
	res();
});
Manager.getNodeName = node => {
	if (node === global.NodeConfig.node.id) return global.NodeConfig.name;
	return SelfInfo.connections[node] || '佚名'
};
Manager.mergeSelfInfo = info => new Promise(async res => {
	info.signin = info.signin || 0;
	if (info.signin <= SelfInfo) return res();
	SelfInfo.name = info.name;
	SelfInfo.connections = info.connections;
	SelfInfo.signin = info.signin;

	try {
		await saveFile(configFilepath, JSON.stringify(SelfInfo));
	}
	catch (err) {
		console.error('保存节点信息时出错：' + err.message);
		return res();
	}

	try {
		await saveAndPublish(false);
	}
	catch (err) {
		console.error('保存并发布信息时出错：' + err.message);
	}

	res();
});
Manager.getSelfInfo = () => SelfInfo;
Manager.update = () => new Promise(async (res, rej) => {
	try {
		await saveAndPublish(false);
	}
	catch (err) {
		rej(err);
		return;
	}
	res();
});

global.NodeManager = Manager;