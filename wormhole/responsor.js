const getUserContent = (node, hash) => new Promise(async res => {
	var path;
	try {
		path = await IPFS.downloadFolder(node, hash);
	}
	catch (err) {
		console.error('获取新内容失败：' + err.message);
		return res(false);
	}
	console.log('获取节点内容：' + path);
	global.ContentUpdated(node, hash, path);
	res(true);
});

const Responsor = {};
Responsor.shakehand = async (sender, msg) => {
	console.log('获得节点 (' + sender + ') 新内容哈希 :::: ' + msg);
	global.Wormhole.sendToNode(sender, 'StarPortUpdated', global.NodeConfig.hash);
	if (global.NodeManager.didSubscribed(sender)) getUserContent(sender, msg);
};
Responsor.StarPortUpdated = async (sender, msg) => {
	console.log('节点 (' + sender + ') 更新内容哈希 :::: ' + msg);
	if (global.NodeManager.didSubscribed(sender)) getUserContent(sender, msg);
};
Responsor.NewContent = async (sender, msg) => {
	console.log('节点 (' + sender + ') 发布新内容: ' + msg);
};

module.exports = Responsor;