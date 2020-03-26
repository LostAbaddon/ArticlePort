import Vue from 'vue'
import VueRouter from 'vue-router'
import config from '../config.js'
import map from './map.js';

const generateRouters = list => {
	var result = [];
	var map = {};
	list.forEach(item => {
		if (!!item.empty) return;

		var pathList = item.path.split(/[\\\/]/).filter(p => p.length > 0);
		var path = '/' + pathList.join('/');
		var key = item.key || pathList[pathList.length - 1];
		var res = {
			name: key,
			path: path,
			meta: { title: item.name },
		};
		if (!!item.redirect) res.redirect = item.redirect;
		else res.component = () => import('../pages' + path + '.vue');
		result.push(res);
	});
	return result;
};
const RouterList = generateRouters(map);

Vue.use(VueRouter);

const router = new VueRouter({
	mode: 'history',
	base: config.baseUrl,
	routes: RouterList
})

export default router;