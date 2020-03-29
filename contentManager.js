const Path = require('path');
const FS = require('fs');
var IO;

const FlushDelay = 1000 * 60;
const FlushCount = 10;

const bookShelves = {};
const Manager = {};
const TimeLine = [];
var storagePath = '';

var updateCount = 0, lastUpdate = Date.now();
const Updater = (channel, cb) => {
	if (!channel) return;
	var bookShelf = bookShelves[channel];
	if (!bookShelf) return;

	bookShelf.updateCount ++;
	var now = Date.now();
	if (bookShelf.updateCount >= FlushCount || now - bookShelf.lastUpdate >= FlushDelay) {
		bookShelf.lastUpdate = now;
		bookShelf.updateCount = 0;
		let content = [];
		for (let item of bookShelf.storage) {
			content.push(item[1]);
		}
		content.sort((a, b) => b.publishAt - a.publishAt);
		content = {content};
		content.lastUpdate = now;
		let folderPath = Path.join(__dirname, global.NodeConfig.storage + '/' + channel);
		_("Utils").preparePath(folderPath, ok => {
			if (!ok) {
				console.error('频道目录（' + folderPath + '）创建失败！');
				return;
			}
			var filePath = Path.join(folderPath, 'index.json');
			FS.readFile(filePath, 'utf8', (err, data) => {
				if (!err) {
					let json;
					try {
						json = JSON.parse(data);
						content.version = json.version + 1;
					} catch {
						console.error('频道文件（' + filePath + '）损坏，已重新创建！');
						content.version = (bookShelf.version || 1) + 1;
					}
					bookShelf.version = content.version;
				}
				else if (err.code === 'ENOENT') {
					content.version = 1;
					bookShelf.version = 1;
				}
				else {
					console.error('读取频道目录（' + filePath + '）失败：', err.message);
					return;
				}
				content = JSON.stringify(content);
				FS.writeFile(filePath, content, 'utf8', () => {
					if (!!cb) cb(folderPath);
				});
			})
		});
	}
};
const GetAllSubFolders = path => new Promise(res => {
	var count = 0;
	var subs = [];
	FS.readdir(path, (err, list) => {
		if (!!err || !list || !list.length) {
			res(subs);
			return;
		}
		count = list.length;
		list.forEach(sub => {
			sub = Path.join(path, sub);
			FS.stat(sub, (err, stats) => {
				count --;
				if (!err && !!stats && stats.isDirectory()) {
					subs.push(sub);
				}
				if (count === 0) res(subs);
			})
		});
	});
});
const ReadTimeline = path => new Promise(res => {
	// 建立本地自己账号的 TimeLine
	var count = 0;
	FS.readdir(path, (err, list) => {
		if (!!err) {
			res();
			return;
		}
		count = list.length;
		if (count === 0) {
			res();
			return;
		}
		list.forEach(sub => {
			var type = sub;
			sub = Path.join(path, sub);
			FS.stat(sub, (err, stats) => {
				if (!!err || !stats.isDirectory()) {
					count --;
					if (count === 0) res();
					return;
				}
				sub = Path.join(sub, 'index.json');
				FS.readFile(sub, 'utf8', (err, data) => {
					if (!!err || !data) {
						count --;
						if (count === 0) res();
						return;
					}
					try {
						data = JSON.parse(data);
					}
					catch {
						count --;
						if (count === 0) res();
						return;
					}
					if (!data || !data.content || !data.content.length) {
						count --;
						if (count === 0) res();
						return;
					}
					data = data.content;
					data.forEach(item => {
						item.type = type;
						TimeLine.push(item);
					});
					count --;
					if (count === 0) res();
				});
			});
		});
	});
});
const ReadMyOwnTimeline = () => new Promise(async res => {
	// 建立本地自己账号的 TimeLine
	var path = Path.join(process.cwd(), global.NodeConfig.storage);
	await ReadTimeline(path);
	res();
});
const ReadLocalTimeline = () => new Promise(async res => {
	// 读取本地已缓存的其它节点的 TimeLine
	var path = Path.join(process.cwd(), 'storage');
	var actions = await GetAllSubFolders(path);
	actions = actions.map(path => ReadTimeline(path));
	await Promise.all(actions);
	res();
});

Manager.init = () => new Promise(async res => {
	IO = require('./server/socket');
	storagePath = Path.join(process.cwd(), 'storage');
	await _("Utils").preparePath(storagePath);

	console.log('获取本地所有内容，并整理为 TimeLine');
	var actions = [];
	actions.push(ReadMyOwnTimeline());
	actions.push(ReadLocalTimeline());
	await Promise.all(actions);
	console.log(TimeLine);

	res();
});
Manager.has = (channel, id) => {
	if (!channel) return false;
	var bookShelf = bookShelves[channel];
	if (!bookShelf) return false;
	return bookShelf.storage.has(id);
};
Manager.set = (channel, id, info) => {
	if (!channel) return false;
	var bookShelf = bookShelves[channel];
	if (!bookShelf) {
		bookShelf = {
			storage: new Map(),
			updateCount: 0,
			lastUpdate: 0
		};
		bookShelves[channel] = bookShelf;
	}

	bookShelf.storage.set(id, info);
	Updater(channel);
};
Manager.packID = channel => {
	if (!channel) return false;
	var bookShelf = bookShelves[channel];
	if (!bookShelf) return -1;
	return bookShelf.version;
};
Manager.flush = channel => new Promise(res => {
	if (!channel) return;
	var bookShelf = bookShelves[channel];
	if (!bookShelf) return;

	bookShelf.lastUpdate = Date.now();
	bookShelf.updateCount = FlushCount;
	Updater(channel, res);
});

global.ContentManager = Manager;

global.ContentUpdated = async (node, hash, path) => {
	console.log(">>>>", path);
	var sPath = Path.join(storagePath, node);
	await _("Utils").preparePath(sPath);

	var [nRooms, oRooms] = await Promise.all([GetAllSubFolders(path), GetAllSubFolders(sPath)]);
	console.log(nRooms);
	console.log(oRooms);

	IO.broadcast('ContentUpdate', path);
};