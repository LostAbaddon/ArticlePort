import api from './api.js';
import socket from './socket.js';

const install = Vue => {
	if (install.installed) {
		return;
	}
	install.installed = true;

	Vue.prototype.$net = {
		send (url, method='get', data) {
			return new Promise((accept, reject) => {
				if (method === 'get' && !!data) {
					let params = [];
					for (let key in data) {
						params.push(key + '=' + data[key]);
					}
					params = params.join('&');
					if (url.indexOf('?') < 0) url = url + '?' + params;
					else url = url + '&' + params;
				}
				api({
					url,
					method,
					data
				}).then(res => {
					if (res.ok) {
						accept(res.data);
					} else {
						console.error(res.message + ' (code: ' + res.code + ')');
						Vue.prototype.$message.error(res.message);
						reject(res);
					}
				}).catch(err => {
					console.error(err);
					Vue.prototype.$message.error(err.message);
					reject(err);
				});
			});
		}
	};
	socket(Vue.prototype);
}

export default install;