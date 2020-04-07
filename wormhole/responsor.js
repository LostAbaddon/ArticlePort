const Responsor = {};

Responsor.shakehand = (sender, msg) => {
	console.log('获得节点 (' + sender + ') 新内容哈希 ===> ' + msg);
	global.Wormhole.sendToNode(sender, 'replyshakehand', global.NodeConfig.hash);

	var path;
	try {
		path = await IPFS.downloadFolder(sender, msg);
	}
	catch (err) {
		console.error('获取新内容失败：' + err.message);
		return;
	}
	console.log('获取节点内容：' + path);
	global.ContentUpdated(sender, msg, path);
};

module.exports = Responsor;