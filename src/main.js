import Vue from 'vue';
import axios from 'axios';
import Vant from 'vant';
import 'vant/lib/index.css';

import net from './net'
import router from './router';
import App from './App.vue';
import './assets/fa/css/all.min.css'; // Font Awesome

window.wait = (delay=0) => new Promise(res => setTimeout(res, delay));

Vue.prototype.$axios = axios;
Vue.use(Vant);
Vue.use(net);
Vue.config.productionTip = false;

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
