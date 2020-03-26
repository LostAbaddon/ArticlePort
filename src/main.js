import Vue from 'vue';
import axios from 'axios';
import Vant from 'vant';
import 'vant/lib/index.css';

import net from './net'
import router from './router';

import SideBar from './components/sidebar/index.js';

import App from './App.vue';
import './assets/fa/css/all.min.css'; // Font Awesome

Vue.prototype.$axios = axios;
Vue.use(Vant);
Vue.use(net);
Vue.use(SideBar);

Vue.config.productionTip = false;

new Vue({
  router,
  render: function (h) { return h(App) }
}).$mount('#app')
