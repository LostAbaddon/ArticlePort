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

const CIDBYTES = 62;
const CIDLENGTH = 44;
const char2num = char => {
	char = char.charCodeAt(0);
	if (char <= 57 && char >= 48) {
		return char - 48;
	}
	else if (char <= 122 && char >= 97) {
		return char - 87;
	}
	else if (char <= 90 && char >= 65) {
		return char - 29;
	}
	return 0;
};
const cid2nums = cid => {
	var result = [], len = cid.length;
	for (let i = 0; i < len; i ++) {
		result[i] = char2num(cid.substr(i, 1));
	}
	return result;
};
const loopDist = (na, nb, max) => {
	var dist1 = Math.abs(na - nb);
	var dist2 = max - dist1;
	return dist1 < dist2 ? dist1 : dist2;
};
const simiDist = (numa, numb) => {
	var len = numa.length > numb.length ? numa.length : numb.length;
	var dist = 0;
	for (let i = 0; i < len; i ++) {
		let a = numa[i] || 0;
		let b = numb[i] || 0;
		dist += loopDist(a, b, CIDBYTES);
	}
	return dist;
};
var myCID;

const Responsor = {};
Responsor.shakehand = async (sender, msg, event) => {
	var hash = msg.message.hash;
	console.log('获得节点 (' + sender + ') 新内容哈希 :::: ' + hash);
	var card = global.Wormhole.getIDCard().copy();
	card.event = 'StarPortUpdated';
	card.generate();
	card = JSON.stringify(card);
	global.Wormhole.sendToNode(sender, card);
	if (global.NodeManager.didSubscribed(sender)) getUserContent(sender, hash);
};
Responsor.StarPortUpdated = async (sender, msg) => {
	var hash = msg.message.hash;
	console.log('节点 (' + sender + ') 更新内容哈希 :::: ' + hash);
	if (global.NodeManager.didSubscribed(sender)) getUserContent(sender, hash);
};
Responsor.NewContent = async (sender, msg) => {
	console.log('节点 (' + sender + ') 发布新内容: ' + msg);
	if (global.NodeManager.didSubscribed(sender)) {
		await global.IPFS.downloadFile(msg);
		console.log('已预取内容 ' + msg);
	}
	else {
		myCID = myCID || cid2nums(global.NodeConfig.node.id);
		let cid = cid2nums(msg);
		let dist = simiDist(myCID, cid);
		if (dist < CIDBYTES / 4 * CIDLENGTH / 2) {
			await global.IPFS.downloadFile(msg);
			console.log('已预取内容 ' + msg);
		}
	}
};

module.exports = Responsor;