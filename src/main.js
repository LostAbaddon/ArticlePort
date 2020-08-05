import Vue from 'vue';
import axios from 'axios';
import Vant from 'vant';
import 'vant/lib/index.css';

import net from './net'
import router from './router';
import App from './App.vue';
import './assets/fa/css/all.min.css'; // Font Awesome

window.wait = (delay=0) => new Promise(res => setTimeout(res, delay));
window.newEle = (tagName, classList, id) => {
	var ele = document.createElement(tagName);
	if (!!id) ele.id = id;
	if (!!classList) {
		if (classList.toString() === classList) classList = classList.split(' ');
		if (classList instanceof Array) {
			classList.forEach(c => ele.classList.add(c));
		}
	}
	return ele;
};

Vue.prototype.$axios = axios;
Vue.use(Vant);
Vue.use(net);
Vue.config.productionTip = false;

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
