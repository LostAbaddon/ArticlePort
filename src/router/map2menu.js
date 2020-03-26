const map2menu = list => {
	var result = [];
	var map = {};
	list.forEach(item => {
		var pathList = item.path.split(/[\\\/]/).filter(p => p.length > 0);
		var path = '/' + pathList.join('/');
		var key = item.key || pathList[pathList.length - 1];
		var res = {
			name: item.name,
			icon: 'fas fab fa-' + item.icon,
			key
		};
		if (!item.empty) res.to = path;
		var pp = '/';
		pathList.forEach((p, i) => {
			p = pp + p;
			pp = p + '/';
			pathList[i] = p;
		});
		pathList.reverse();
		map[path] = {
			pathList,
			item: res
		};
	});
	for (let path in map) {
		let { pathList, item } = map[path];
		let parent = null;
		pathList.some(p => {
			if (p === path) return false;
			var p = map[p];
			if (!p) return false;
			parent = p.item;
			return true;
		});
		if (!parent || parent === item) result.push(item);
		else {
			parent.subs = parent.subs || [];
			parent.subs.push(item);
		}
	}
	return result;
};

export default map2menu;