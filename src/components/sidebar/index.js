import menubar from './index.vue'
import menubarItem from './bar.vue'

const install = Vue => {
	if (install.installed) {
		return;
	}
	install.installed = true;

	Vue.component(menubar.name, menubar);
	Vue.component(menubarItem.name, menubarItem);
}

export default install;