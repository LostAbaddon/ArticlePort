const FS = require('fs');
const Path = require('path');

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
			FS.stat(sub, (err, stat) => {
				count --;
				if (!err && !!stat && stat.isDirectory()) {
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

_('Utils.getAllSubFolders', getAllSubFolders);
_('Utils.getJSON', getJSON);
_('Utils.saveFile', saveFile);