// IPFS 主入口

const Path = require('path');
const FS = require('fs');
const crypto = require("crypto");
const multihash = require('multihashes');
const base58 = require('bs58');
const saveFile = _('Utils.saveFile');

const FieldPath = Path.join(__dirname, '../../field');
_("Utils").preparePath(FieldPath, ok => {
	console.log('临时文件目录（' + FieldPath + '）：' + ok);
});
var storagePath;

const publish = async (data, socket, event) => {
	if (!data.id) return;

	storagePath = storagePath || Path.join(__dirname, '../../' + global.NodeConfig.storage);

	var info = {}, file = data.file, channel = data.channel;
	info.id = data.id;
	info.fingerprint = data.fingerprint || '';
	info.title = data.title || '无名之文';
	info.author = data.author || NodeConfig.name;
	info.description = data.description || '';
	info.publisher = NodeConfig.node.id;
	info.publishAt = Date.now();
	info.repost = false;
	info.type = data.type || 0;

	var tempFileName = data.id + '-' + info.publishAt + '.file';
	tempFileName = Path.join(FieldPath, tempFileName);

	try {
		await saveFile(tempFileName, file);
	}
	catch (err) {
		console.error('写临时文件 ' + tempFileName + ' 失败：', err);
		return;
	}

	var result;
	try {
		result = await IPFS.uploadFile(tempFileName);
	} catch (err) {
		console.error(err);
	}
	FS.unlink(tempFileName, err => {
		if (!err) return;
		console.log('删除临时文件 ' + tempFileName + ' 时出错: ', err);
	});

	if (!result) {
		console.error('将文件写入 IPFS 失败：' + data.title + ' / ' + data.id);
		return;
	}
	console.log('新文件上传到星网成功：' + result);
	info.hash = result;
	global.Wormhole.broadcast('NewContent', result, true);

	// 更新本地记录，同时广播到前端
	await ContentManager.set(channel, info.id, info);

	// 更新星站索引
	try {
		result = await IPFS.uploadFolder(storagePath);
	}
	catch (err) {
		console.error('更新目录失败：' + err);
		return;
	}
	console.log('新内容站哈希: ' + result);
	global.NodeConfig.hash = result;

	socket.send('articlePublished', {
		id: data.id,
		file: info.hash,
		folder: result,
		host: global.NodeConfig.node.id,
		pack: ContentManager.packID(channel)
	});

	try {
		result = await IPFS.publish(result);
	} catch (err) {
		console.error('发布更新失败：' + err);
		return;
	}
	if (!result) return;
	console.log('星站内容已更新！', result);

	socket.send('starportUpdated', {
		id: data.id,
		hash: result
	});
};
const saveResource = async (data, socket, event) => {
	if (!data || !data.data) {
		socket.send('saveResource', null, "数据丢失");
		return;
	}
	var ext = data.name.split(/\.+/).last;
	if (!ext) ext = data.type.split(/[\\\/]+/).last;
	if (!ext) {
		socket.send('saveResource', null, "无效的后缀名");
		return;
	}
	var filename = crypto.createHash('sha256').update(data.data).digest();
	filename = await multihash.encode(filename, 'sha2-256');
	filename = base58.encode(filename) + '.' + ext;
	var filepath = Path.join(FieldPath, filename);

	try {
		await saveFile(filepath, data.data, null);
	} catch (err) {
		console.error(err);
		socket.send('saveResource', null, err.message);
		return;
	}

	var hash;
	try {
		hash = await IPFS.uploadFile(filepath);
	} catch (err) {
		console.error(err);
	}
	FS.unlink(filepath, err => {
		if (!err) return;
		console.log('删除临时文件 ' + filepath + ' 时出错: ', err);
	});

	if (!!hash) {
		socket.send('saveResource', {
			ok:true,
			url: 'http://starport.contverse.gfs/resource/' + hash + '.' + ext,
			target: data.id,
			name: data.name
		});
		console.log('成功上传资源：' + filename + ' (' + hash + ')');
	}
	else {
		socket.send('saveResource', null, '上传到星网失败')
	}
};

module.exports = [
	{
		event: 'publish',
		callback: publish
	},
	{
		event: 'saveResource',
		callback: saveResource
	}
];