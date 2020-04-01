const Path = require('path');
const FS = require('fs');
const getAllSubFolders = _('Utils.getAllSubFolders');
const getJSON = _('Utils.getJSON');
const saveFile = _('Utils.saveFile');
const prepare = _("Utils").preparePath;
const IO = require('./server/socket');;

const SelfFetchRetry = 1000 * 60;
const SelfFetchDelay = 1000 * 60 * 10;

const storagePath = Path.join(process.cwd(), 'storage');
_("Utils").preparePath(storagePath, ok => {
	console.log('临时仓库目录（' + storagePath + '）：' + ok);
});
var localStorage;

class HistoryItem {
	fingerprint = "";
	title = "无名文";
	description = '无简介';
	publisher = "";
	publishAt = 0;
	hash = "";
	type = 0;

	toJSON () {
		return {
			fingerprint: this.fingerprint,
			title: this.title,
			description: this.description,
			publisher: this.publisher,
			publishAt: this.publishAt,
			hash: this.hash,
			type: this.type
		};
	}

	static fromJSON (json, item) {
		if (String.is(json)) {
			json = { hash: json };
		}
		var hist = new HistoryItem();
		hist.fingerprint = json.fingerprint || item.fingerprint;
		hist.title = json.title || item.title;
		hist.description = json.description || item.description;
		hist.publisher = json.publisher || item.publisher;
		hist.publishAt = json.publishAt || item.publishAt;
		hist.hash = json.hash || item.hash;
		hist.type = json.type || item.type;
		return hist;
	}
}
class ContentItem {
	id = "";
	channel = '';
	fingerprint = "";
	title = "无名文";
	description = '无简介';
	author = "佚名";
	publisher = "";
	publishAt = 0;
	hash = "";
	type = 0;
	repost = false;
	history = [];

	modify (key, value) {
		if (key === 'title') {
			if (value === this.title) return;
			this.title = value;
		}
		else if (key === 'author') {
			if (value === this.author) return;
			this.author = value;
		}
		else if (key === 'description') {
			if (value === this.description) return;
			this.description = value;
		}
		else if (key === 'type') {
			if (value === this.type) return;
			this.type = value;
		}
		else return;
		this.publishAt = Date.now();
		this.snap();
	}
	update (hash, fingerprint, publisher) {
		this.hash = hash;
		this.fingerprint = fingerprint;
		this.publisher = publisher || global.NodeConfig.node.id;
		this.publishAt = Date.now();
		this.snap();
	}
	hasHistory (hash) {
		return this.history.some(h => h.hash === hash);
	}
	addHistory (hist) {
		var old = this.history.filter(h => h.hash === hist.hash);
		if (old.length === 0) {
			this.history.push(old);
		}
		else {
			old = old[0];
			if (old.publishAt <= hist.publishAt) return false;
			old.fingerprint = hist.fingerprint || old.fingerprint;
			old.title = hist.title || old.title;
			old.description = hist.description || old.description;
			old.publisher = hist.publisher || old.publisher;
			old.publishAt = hist.publishAt;
			old.type = hist.type;
		}
		this.snap();
		return true;
	}
	getHistory (hash, withChannel=false) {
		var old = this.history.filter(h => h.hash === hash);
		if (old.length === 0) return undefined;
		old = old[0];
		var json = this.toJSON(withChannel);
		json.fingerprint = old.fingerprint;
		json.title = old.title;
		json.description = old.description;
		json.publisher = old.publisher;
		json.publishAt = old.publishAt;
		json.hash = old.hash;
		json.type = old.type;
		return json;
	}
	snap () {
		var hist = this.history.filter(h => h.hash === this.hash);
		if (hist.length === 0) {
			hist = new HistoryItem();
			hist.fingerprint = this.fingerprint;
			hist.title = this.title;
			hist.description = this.description;
			hist.publisher = this.publisher;
			hist.publishAt = this.publishAt;
			hist.hash = this.hash;
			hist.type = this.type;
			hist.repost = this.repost;
			this.history.unshift(hist);
		}
		else {
			hist = hist[0];
			hist.fingerprint = this.fingerprint;
			hist.title = this.title;
			hist.description = this.description;
			hist.publisher = this.publisher;
			hist.publishAt = this.publishAt;
			hist.type = this.type;
		}
		this.history.sort((ha, hb) => hb.publishAt - ha.publishAt);
		hist = this.history[0];
		this.fingerprint = hist.fingerprint;
		this.title = hist.title;
		this.description = hist.description;
		this.publisher = hist.publisher;
		this.publishAt = hist.publishAt;
		this.hash = hist.hash;
		this.type = hist.type;
	}
	merge (content) {
		var changed = false;
		if (content.id !== this.id) return changed;
		if (!(content instanceof ContentItem)) {
			content = ContentItem.fromJSON(content);
		}
		else {
			content.snap();
		}
		content.history.forEach(hist => {
			changed = this.addHistory(hist) || changed;
		});
		this.snap();
		return changed;
	}
	toJSON (withChannel=false) {
		var json = {
			id: this.id,
			fingerprint: this.fingerprint,
			title: this.title,
			description: this.description,
			author: this.author,
			publisher: this.publisher,
			publishAt: this.publishAt,
			hash: this.hash,
			type: this.type,
			repost: this.repost,
			history: this.history.map(h => h.toJSON())
		};
		if (withChannel) json.channel = this.channel;
		return json;
	}

	static fromJSON (json) {
		var item = new ContentItem();
		item.id = json.id || "";
		item.fingerprint = json.fingerprint || "";
		item.title = json.title || "无名文";
		item.description = json.description || "无简介";
		item.author = json.author || "佚名";
		item.publisher = json.publisher || global.NodeConfig.node.id;
		item.publishAt = json.publishAt || 0;
		item.hash = json.hash || "";
		item.type = json.type || "";
		item.repost = !!json.repost;
		item.history = [];
		(json.history || []).forEach(i => {
			var hist = HistoryItem.fromJSON(i, item);
			if (item.history.some(h => h.hash === hist.hash)) return;
		});
		item.snap();

		return item;
	}
}
class ContentChannel {
	name = "ArticleMarket";
	file = "";
	contentList = [];
	contentMap = {};
	lastUpdate = 0;
	version = 0;
	changed = false;

	constructor (name, file) {
		if (!!name) this.name = name;
		if (!!file) this.file = file;
	}
	add (content) {
		var added = false;
		if (!(content instanceof ContentItem)) content = ContentItem.fromJSON(content);
		content.channel = this.name;
		var old = this.contentList.filter(c => c.id === content.id);
		if (old.length === 0) {
			this.contentList.push(content);
			added = true;
		}
		else {
			old = old[0];
			added = old.merge(content);
		}
		this.arrange();
		this.changed = added;
		return added;
	}
	getByID (id, withChannel=false) {
		var target = this.contentMap[id];
		if (!target) return undefined;
		return target.toJSON(withChannel);
	}
	getByHash (hash, withChannel=false) {
		var target = this.contentList.filter(ctx => ctx.hasHistory(hist));
		if (target.length === 0) return undefined;
		target = target[0];
		return target.getHistory(hash, withChannel);
	}
	update () {
		if (!this.changed) return;
		this.lastUpdate = Date.now();
		this.version ++;
		this.changed = false;
	}
	arrange () {
		this.contentList.sort((ia, ib) => ib.publishAt - ia.publishAt);
		this.contentList.forEach(item => this.contentMap[item.id] = item);
	}
	fromFile (path) {
		return new Promise(async res => {
			path = path || this.file;
			var json = await getJSON(path);
			if (!json.content) return res(false);
			this.lastUpdate = Math.max(this.lastUpdate, json.lastUpdate);
			this.version = Math.max(this.version, json.version);
			var changed = false;
			json.content.forEach(content => {
				changed = this.add(content) || changed;
			});
			this.arrange();
			res(changed);
		});
	}
	toFile (path, forced=false) {
		return new Promise(async (res, rej) => {
			if (!this.changed && !forced) return res();
			path = path || this.file;
			var folder = Path.parse(path).dir;
			try {
				await prepare(folder);
			}
			catch (err) {
				return rej(err);
			}
			this.arrange();
			this.update();
			var json = {
				lastUpdate: this.lastUpdate,
				version: this.version,
				content: this.contentList.map(c => c.toJSON())
			};
			try {
				await saveFile(path, JSON.stringify(json));
			}
			catch (err) {
				err = new Error('保存个人频道（' + path + '）出错：' + err.message);
				return rej(err);
			}
			res();
		});
	}
}
class ContentTimeLine {
	channels = {};
	changed = false;
	folderpath = '';
	timeline = [];
	group;

	constructor (path) {
		if (!!path) this.folderpath = path;
	}
	prepare (channel, filepath) {
		var ch = this.channels[channel];
		if (!!ch) return ch;
		if (!filepath) filepath = Path.join(this.folderpath, channel, 'index.js');
		ch = new ContentChannel(channel, filepath);
		this.channels[channel] = ch;
		return ch;
	}
	add (channel, content) {
		var ch = this.channels[channel];
		if (!ch) {
			let filepath = Path.join(this.folderpath, channel, 'index.js');
			ch = new ContentChannel(channel, filepath);
			this.channels[channel] = ch;
		}
		var added = ch.add(content);
		if (added) {
			this.changed = true;
			if (!!this.group) this.group.changed = true;
		}
		return added;
	}
	getByID (channel, id, withChannel=false) {
		var ch = this.channels[channel];
		if (!ch) return undefined;
		return ch.getByID(id, withChannel);
	}
	getByHash (channel, hash, withChannel=false) {
		var ch = this.channels[channel];
		if (!ch) return undefined;
		return ch.getByHash(hash, withChannel);
	}
	fromFile (channel, path) {
		return new Promise(async res => {
			var ch = this.channels[channel];
			if (!ch) {
				if (!path) return res(false);
				ch = new ContentChannel(channel, path);
				this.channels[channel] = ch;
			}
			var changed = await ch.fromFile(path);
			if (changed) {
				this.changed = true;
				if (!!this.group) this.group.changed = true;
			}
			res(changed);
		});
	}
	reloadAllFromFile (folderpath) {
		return new Promise(async res => {
			folderpath = folderpath || this.folderpath;
			var subs = await getAllSubFolders(folderpath);
			var actions = [];
			subs.forEach(sub => {
				var channel = sub.replace(folderpath, '').replace(/^[\\\/]+/, '');
				var ch = this.prepare(channel, Path.join(sub, 'index.json'));
				actions.push(ch.fromFile());
			});
			var changes = await Promise.all(actions);
			var changed = changes.some(c => {
				if (!c) return false;
				changed = true;
				return true;
			});
			if (changed) {
				this.changed = true;
				if (!!this.group) this.group.changed = true;
			}
			this.update();
			res(changed);
		});
	}
	toFile (channel, path, force=false) {
		return new Promise(async (res, rej) => {
			var ch = this.channels[channel];
			if (!ch) return res(false);
			try {
				await ch.toFile(path, force);
			}
			catch (err) {
				return rej(err);
			}
			res(true);
		});
	}
	dumpAllToFile (folderpath, force=false) {
		return new Promise(async res => {
			folderpath = folderpath || this.folderpath;
			this.update();
			var actions = Object.keys(this.channels).map(ch => new Promise(async res => {
				ch = this.channels[ch];
				var path = Path.join(folderpath, ch.name, 'index.json')
				try {
					await ch.toFile(path, force);
				}
				catch (err) {
					console.error('将索引数据写入本地文件（' + path + '）失败：' + err.message);
				}
				res();
			}));
			await Promise.all(actions);
			res();
		});
	}
	update () {
		if (!this.changed) return;
		var list = [];
		Object.keys(this.channels).forEach(ch => {
			ch = this.channels[ch];
			list.push(...ch.contentList);
		});
		list.sort((ca, cb) => cb.publishAt - ca.publishAt);
		this.timeline = list;
		this.changed = false;
	}
	getTimeLine (channels) {
		if (!channels) {
			channels = Object.keys(this.channels);
		}
		else if (String.is(channels)) channels = [channels];
		else if (!Array.isArray(channels)) return null;
		this.update();
		var timeline = [];
		this.timeline.forEach(item => {
			if (!channels.includes(item.channel)) return;
			timeline.push(item);
		});
		return timeline;
	}
}
class TimeLineGroup {
	timelines = {};
	contentMap = {};
	main;
	timeline = [];
	changed = false;

	constructor (hash, path) {
		this.main = new ContentTimeLine(path);
		this.main.group = this;
		this.timelines[hash] = this.main;
	}
	add (hash, path) {
		var tl = this.timelines[hash];
		if (!!tl) return tl;
		tl = new ContentTimeLine(path);
		tl.group = this;
		this.timelines[hash] = tl;
		return tl;
	}
	get (hash) {
		return this.timelines[hash];
	}
	has (hash) {
		return !!this.timelines[hash];
	}
	getByID (id, withChannel=false) {
		var ctx = this.contentMap[id];
		if (!ctx) return undefined;
		return ctx.toJSON(withChannel);
	}
	getByHash (id, hash, withChannel=false) {
		var ctx = this.contentMap[id];
		if (!ctx) return undefined;
		return ctx.getHistory(hash, withChannel);
	}
	update () {
		if (!this.changed) return;

		var timeline = [];
		Object.keys(this.timelines).forEach(tl => {
			tl = this.timelines[tl];
			tl.update();
			tl = tl.timeline;
			tl.forEach(item => {
				var old = this.contentMap[item.id];
				if (!old) this.contentMap[item.id] = item;
				else old.merge(item);
			});
		});
		timeline = Object.keys(this.contentMap).map(id => this.contentMap[id]);
		timeline.sort((ca, cb) => cb.publishAt - ca.publishAt);
		this.timeline = timeline;
		this.changed = false;
	}
	getTimeline (channels) {
		if (!channels) {
			channels = Object.keys(this.channels);
		}
		else if (String.is(channels)) channels = [channels];
		else if (!Array.isArray(channels)) return null;

		this.update();
		return this.timeline.filter(item => channels.includes(item.channel));
	}
}

const Manager = {};
var TimeLine; 

Manager.init = () => new Promise(async res => {
	localStorage = Path.join(process.cwd(), global.NodeConfig.storage);
	TimeLine = new TimeLineGroup(global.NodeConfig.node.id, localStorage);
	var actions = [TimeLine.main.reloadAllFromFile()];

	var subs = await getAllSubFolders(storagePath);
	subs.forEach(path => {
		var remote = path.replace(storagePath, '').replace(/^[\\\/]/, '');
		var tl = TimeLine.add(remote, path);
		actions.push(tl.reloadAllFromFile());
	});

	await Promise.all(actions);

	// 从 IPFS 上更新自身数据
	Manager.fetchSelf();

	res();
});
Manager.has = (channel, id) => {
	if (!channel) return false;
	var ch = TimeLine.main.channels[channel];
	if (!ch) return false;
	return !!ch.contentMap[id];
};
Manager.set = (channel, id, info) => new Promise(async res => {
	if (!channel) return res(false);
	var added = TimeLine.main.add(channel, info);
	if (added) {
		TimeLine.main.update();
		await TimeLine.main.toFile(channel);
		IO.broadcast('TimelineUpdated');
	}
	res(added);
});
Manager.get = (channel, id, hash) => new Promise(async (res, rej) => {
	if (!channel) return rej(new Error('频道信息错误！'));
	TimeLine.update();
	var content;
	if (!!hash) {
		content = TimeLine.getByHash(id, hash, true);
		if (!content) return rej(new Error('指定历史版本（' + hash + '）不属于该文档（' + id + '）！'));
	}
	else {
		content = TimeLine.getByID(id, true);
		if (!content) return rej(new Error('无指定文档（' + id + '）！'));
	}
	content.publisher = global.NodeManager.getNodeName(content.publisher);

	try {
		content.content = await IPFS.downloadFile(content.hash);
	}
	catch (err) {
		rej(err);
		return;
	}
	console.log('从星网获取文件：' + content.hash);
	res(content);
});
Manager.packID = channel => {
	if (!channel) return -1;
	var ch = TimeLine.main.channels[channel];
	if (!ch) return -1;
	return ch.version;
};
Manager.flush = channel => new Promise(async res => {
	if (!channel) return res();
	var ch = TimeLine.main.channels[channel];
	if (!ch) return res();

	await ch.toFile();
	res();
});
Manager.getTimeline = channels => {
	console.log
	return TimeLine.getTimeline(channels);
};
Manager.fetchSelf = async () => {
	console.log('更新星门信息……');
	var hash;
	try {
		hash = await IPFS.resolve(global.NodeConfig.node.id);
	}
	catch {
		setTimeout(Manager.fetchSelf, SelfFetchRetry);
		return;
	}
	var path = await IPFS.downloadFolder(global.NodeConfig.node.id, hash);
	var remoteInfo = await getJSON(Path.join(path, 'personel.json'));
	var localInfo = global.NodeManager.getSelfInfo();
	remoteInfo.signin = remoteInfo.signin || 0;
	if (remoteInfo.signin > localInfo.signin) {
		await global.NodeManager.mergeSelfInfo(remoteInfo);
	}

	var changed = await TimeLine.main.reloadAllFromFile(path);
	if (changed) {
		console.log('星门有来自远端的更新！');
		await TimeLine.main.dumpAllToFile(localStorage);
		TimeLine.update();
		IO.broadcast('TimelineUpdated');
	}

	setTimeout(Manager.fetchSelf, SelfFetchDelay);
};

global.ContentManager = Manager;

global.ContentUpdated = async (node, hash, remotePath) => {
	var localPath = Path.join(storagePath, node);
	await prepare(localPath);

	var tl = TimeLine.get(node);
	if (!tl) tl = TimeLine.add(node, localPath);

	// 判断用户名是否发生更改
	var remoteFile = Path.join(remotePath, 'personel.json');
	var localFile = Path.join(localPath, 'personel.json')
	var [remoteInfo, localInfo] = await Promise.all([
		getJSON(remoteFile),
		getJSON(localFile)
	]);
	remoteInfo.signin = remoteInfo.signin || 0;
	localInfo.signin = localInfo.signin || 0;
	if (remoteInfo.signin > localInfo.signin) {
		await Promise.all([
			saveFile(localFile, JSON.stringify(remoteInfo)),
			global.NodeManager.changeNodeName(node, remoteInfo.name)
		]);
	}

	var changed = await tl.reloadAllFromFile(remotePath);
	if (changed) {
		await tl.dumpAllToFile(localPath);
		TimeLine.update();
		IO.broadcast('TimelineUpdated');
	}
};