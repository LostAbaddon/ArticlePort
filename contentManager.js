const Path = require('path');
const FS = require('fs');

const FlushDelay = 1000 * 60;
const FlushCount = 10;

const bookShelves = {};
const Manager = {};

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

global.ContentUpdated = (node, hash, path) => {
	
};