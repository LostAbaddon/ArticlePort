const Path = require('path');
const crypto = require("crypto");
const protobuf = require('protons');
const keysPBM = protobuf(require('./keys.proto'));
const base58 = require('bs58');
const multihash = require('multihashes');
const saveFile = _('Utils.saveFile');
const getJSON = _('Utils.getJSON');

const keyMap = new Map();
var filepath;

const Utils = {
	init: () => new Promise(async res => {
		filepath = Path.join(process.cwd(), global.NodeConfig.storage, 'keys.json');
		var keys;
		try {
			keys = await getJSON(filepath);
		}
		catch {
			return res();
		}
		for (let cid in keys) {
			let key = keys[cid];
			if (!(await Utils.checkPubKey(cid, key))) continue;
			let pubkey = Utils.convertKey(key);
			keyMap.set(cid, [pubkey, key]);
		}
		res();
	}),
	marshal (key, type="RSA") {
		if (String.is(key)) key = Buffer.from(key, 'base64');
		if (type === 'Ed25519') type = 1;
		else if (type === 'Secp256k1') type = 2;
		else type = 0;
		const encoded = keysPBM.Key.encode({Type: type, Data: key});
		return encoded;
	},
	unmarshal (buf) {
		if (String.is(buf)) buf = Buffer.from(buf, 'base64');
		const decoded = keysPBM.Key.decode(buf);
		return decoded.Data;
	},
	pubkey2cid: key => new Promise(async res => {
		var buf = Buffer.from(key, 'base64');
		buf = crypto.createHash('sha256').update(buf).digest();
		buf = await multihash.encode(buf, 'sha2-256');
		res(buf);
	}),
	checkPubKey: (cid, key) => new Promise(async res => {
		var bufCid = base58.decode(cid);
		var bufKey = await Utils.pubkey2cid(key);
		if (!bufCid.equal(bufKey)) return res(false);
		res(true);
	}),
	convertKey: key => {
		var buf = Utils.unmarshal(key);
		var pubkey = crypto.createPublicKey({
			key: buf,
			format: 'der',
			type: 'spki'
		});
		return pubkey;
	},
	getPubKey: cid => (keyMap.get(cid) || [])[0],
	setPubKey: (cid, key) => new Promise(async res => {
		if (keyMap.has(cid)) return res(true);
		if (!(await Utils.checkPubKey(cid, key))) return res(false);

		try {
			let pubkey = Utils.convertKey(key);
		}
		catch (err) {
			console.error('记录节点 ' + cid + ' 的公钥失败：' + err.message);
			return res(false);
		}
		keyMap.set(cid, [pubkey, key]);
		res(true);
		Utils.saveKeys();
	}),
	saveKeys: () => {
		var keys = {};
		for (let [cid, key] of keyMap) {
			keys[cid] = key[1];
		}
		saveFile(filepath, JSON.stringify(keys));
	},
};

module.exports = Utils;