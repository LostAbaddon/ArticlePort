const Path = require('path');
const FS = require('fs');
const getJSON = _('Utils.getJSON');
const saveFile = _('Utils.saveFile');
const prepare = _("Utils").preparePath;

const Manager = {};
const SelfInfo = {};
var configFilepath = '';
var storagePath = '';

const saveAndPublish = (needSave=true, broadcast=true) => new Promise(async res => {
	if (needSave) {
		SelfInfo.signin = Date.now();
		try {
			await saveFile(configFilepath, JSON.stringify(SelfInfo));
		}
		catch (err) {
			console.error('保存节点信息时出错：' + err.message);
			return res(null);
		}
	}

	var hash;
	try {
		hash = await IPFS.uploadFolder(storagePath);
	}
	catch (err) {
		console.error('更新目录失败：' + err.message);
		return res(null);
	}
	console.log('更新内容星站：' + hash);
	global.NodeConfig.hash = hash;
	res(hash);

	if (!broadcast) return;

	global.Wormhole.broadcast('StarPortUpdated', hash);
	try {
		await IPFS.publish(hash);
	}
	catch (err) {
		console.error('发布更新失败：' + err.message);
		return;
	}
	console.log('星站内容已更新！ (' + global.NodeConfig.node.id + ' <==== ' + hash + ')');
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
	SelfInfo.publicPort = json.publicPort || SelfInfo.port;
	SelfInfo.connections = json.connections || {};
	global.NodeConfig.node.publicPort = SelfInfo.publicPort;

	Object.keys(SelfInfo.connections).forEach(id => {
		IPFS.subscribe(id);
	});

	try {
		await saveAndPublish(json.port !== global.NodeConfig.port);
	}
	catch (err) {
		console.error('保存并发布信息时出错：' + err.message);
	}
	res();
});
Manager.getNodeList = () => {
	return Object.keys(SelfInfo.connections || {}).map(id => {
		var name = SelfInfo.connections[id];
		name = name.name || name.toString();
		return { name, id };
	});
};
Manager.addNode = node => new Promise(async (res, rej) => {
	var old = !!SelfInfo.connections[node];
	if (old) return res();
	SelfInfo.connections[node] = node;

	IPFS.subscribe(node);
	try {
		await saveAndPublish(true);
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
		await saveAndPublish(true);
	}
	catch (err) {
		console.error('删除节点（' +  node + '）时：' + err.message);
	}
	res();
});
Manager.didSubscribed = node => {
	return !!SelfInfo.connections[node];
};
Manager.changeNodeName = (node, name) => new Promise(async res => {
	var old = SelfInfo.connections[node];
	if (!!old && (old === name || old.name === name)) return res(false);
	if (!old) old = {name};
	else if (String.is(old)) old = {name};
	else old.name = name;

	try {
		await saveAndPublish(true, false);
	}
	catch (err) {
		console.error('修改节点名（' + node + '）字时出错：' + err.message);
		return res(false);
	}
	res(true);
});
Manager.changeNodeInfo = (node, name, hash, stamp) => new Promise(async res => {
	var item = SelfInfo.connections[node];
	if (!item) item = {name, stamp: 0};
	else if (String.is(item)) item = {name: item, stamp: 0};
	var changed = false;
	if (item.name !== name) {
		changed = true;
		item.name = name;
	}
	if (item.stamp < stamp) {
		changed = true;
		item.hash = hash;
		item.stamp = stamp;
	}
	if (!changed) return res(false);
	SelfInfo.connections[node] = item;

	try {
		await saveAndPublish(true,false);
	}
	catch (err) {
		console.error('修改节点内容地址（' + node + '）时出错：' + err.message);
		return res(false);
	}
	res(true);
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
Manager.update = (needSave=false) => new Promise(async (res, rej) => {
	try {
		await saveAndPublish(needSave);
	}
	catch (err) {
		rej(err);
		return;
	}
	res();
});
Manager.changePublicPort = port => new Promise(async res => {
	if (global.NodeConfig.node.publicPort === port) return res(false);
	global.NodeConfig.node.publicPort = port;
	SelfInfo.publicPort = port;
	var ok = true;
	try {
		await saveAndPublish(true);
	}
	catch (err) {
		ok = false;
		console.error('保存并发布信息时出错：' + err.message);
	}
	res(ok);
});

global.NodeManager = Manager;