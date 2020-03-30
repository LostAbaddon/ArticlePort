const Path = require('path');
const FS = require('fs');
var prepare;
var IO;

const FlushDelay = 1000 * 60;
const FlushCount = 10;

const bookShelves = {};
const Manager = {};
const TimeLine = [];
const ContentMap = {};
var storagePath = '';
var localStorage = '';

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
		let folderPath = Path.join(localStorage, channel);
		prepare(folderPath, ok => {
			if (!ok) {
				console.error('频道目录（' + folderPath + '）创建失败！');
				return;
			}
			var filePath = Path.join(folderPath, 'index.json');
			FS.readFile(filePath, 'utf8', async (err, data) => {
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
				await saveFile(filePath, content);
				if (!!cb) cb(folderPath);
			})
		});
	}
};
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
						item.publishAt = item.publishAt || 1;
						var old = ContentMap[item.id];
						if (!old) {
							ContentMap[item.id] = item;
							TimeLine.push(item);
						}
						else {
							old.publishAt = old.publishAt || 0;
							if (item.publishAt > old.publishAt) {
								let idx = TimeLine.indexOf(old);
								TimeLine.splice(idx, 1, item);
								ContentMap[item.id] = item;
							}
						}
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
	await ReadTimeline(localStorage);
	res();
});
const ReadLocalTimeline = () => new Promise(async res => {
	// 读取本地已缓存的其它节点的 TimeLine
	var path = Path.join(process.cwd(), 'storage');
	var actions = await getAllSubFolders(path);
	actions = actions.map(path => ReadTimeline(path));
	await Promise.all(actions);
	res();
});

const getAllSubFolders = path => new Promise(res => {
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
const getJSON = path => new Promise(res => {
	FS.readFile(path, 'utf8', (err, data) => {
		if (!!err || !data) {
			res({});
			return;
		}
		try {
			data = JSON.parse(data);
		}
		catch {
			res({});
			return;
		}
		res(data);
	});
});
const saveFile = (path, content) => new Promise((res, rej) => {
	FS.writeFile(path, content, 'utf8', err => {
		if (!!err) rej(err);
		else res();
	})
});
const readLocalStorage = () => new Promise(async res => {
	var subFolders = await getAllSubFolders(localStorage);
	var count = subFolders.length;
	if (count === 0) return res();
	subFolders.forEach(async path => {
		var channel = path.replace(localStorage, '').replace(/^[\\\/]+/, '');
		var filepath = Path.join(path, 'index.json');
		var content = await getJSON(filepath);
		if (!!content) {
			let bookShelf = {
				version: content.version,
				lastUpdate: content.lastUpdate,
				storage: new Map()
			};
			(content.content || []).forEach(item => {
				bookShelf.storage.set(item.id, item);
			});
			bookShelves[channel] = bookShelf;
		}
		count --;
		if (count === 0) res();
	});
});

Manager.init = () => new Promise(async res => {
	IO = require('./server/socket');
	prepare = _("Utils").preparePath;
	localStorage = Path.join(process.cwd(), global.NodeConfig.storage);
	storagePath = Path.join(process.cwd(), 'storage');

	await Promise.all([
		readLocalStorage(),
		prepare(storagePath)
	]);

	var actions = [];
	actions.push(ReadMyOwnTimeline());
	actions.push(ReadLocalTimeline());
	await Promise.all(actions);
	TimeLine.sort((a, b) => b.publishAt - a.publishAt);

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
Manager.getTimeline = () => TimeLine;

global.ContentManager = Manager;

global.ContentUpdated = async (node, hash, path) => {
	var sPath = Path.join(storagePath, node);
	await prepare(sPath);

	// 判断用户名是否发生更改
	var [nPerson, oPerson] = await Promise.all([
		getJSON(Path.join(path, 'personel.json')),
		getJSON(Path.join(sPath, 'personel.json'))
	]);
	if ((nPerson.signin || 0) > (oPerson.signin || 0)) {
		await Promise.all([
			saveFile(Path.join(sPath, 'personel.json'), JSON.stringify(nPerson)),
			global.NodeManager.changeNodeName(node, nPerson.name)
		]);
	}

	var nRooms = await getAllSubFolders(path);
	// 不再订阅的频道不会被主动删除
	await Promise.all(nRooms.map(subpath => new Promise(async res => {
		var countPath = subpath.replace(path, sPath);
		await prepare(countPath);
		var [nList, oList] = await Promise.all([
			getJSON(Path.join(subpath, 'index.json')),
			getJSON(Path.join(countPath, 'index.json'))
		]);
		nList.version = nList.version || 1;
		oList.version = oList.version || 1;
		nList.lastUpdate = nList.lastUpdate || 1;
		oList.lastUpdate = oList.lastUpdate || 1;
		if (nList.version > oList.version || (nList.version === oList.version && nList.lastUpdate > oList.lastUpdate)) {
			oList.version = nList.version;
			oList.lastUpdate = nList.lastUpdate;
			let list = {};
			(oList.content || []).forEach(item => {
				list[item.id] = item;
			});
			(nList.content || []).forEach(item => {
				var id = item.id;
				var old = list[id];
				if (!old || item.publishAt > old.publishAt) {
					list[id] = item;
					old = ContentMap[id];
					ContentMap[id] = item;
					TimeLine.remove(old);
					TimeLine.push(item);
				}
			});
			list = Object.keys(list).map(id => list[id]);
			list.sort((a, b) => b.publishAt - a.publishAt);
			nList.content = list;
			await saveFile(Path.join(countPath, 'index.json'), JSON.stringify(nList));
		}
		res();
	})));

	TimeLine.sort((a, b) => b.publishAt - a.publishAt);

	IO.broadcast('ContentUpdate');
};