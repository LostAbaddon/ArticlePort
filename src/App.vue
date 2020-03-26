<template>
	<div id="app">
		<v-header :title="title" :subtitle="subtitle"></v-header>
		<v-side-bar :menu="menu" :initKey="init" @click="chooseRole"></v-side-bar>
		<div class="page-container" :class="{'collapsed':collapsed}">
			<div class="content">
				<transition name="move" mode="out-in">
					<keep-alive>
						<router-view></router-view>
					</keep-alive>
				</transition>
			</div>
		</div>
	</div>
</template>

<script>
import config from './config.js';
import routerMap from './router/map.js';
import map2menu from './router/map2menu.js';
import eventBus from './components/eventbus.js';
import vHeader from './components/header.vue';
import vSideBar from './components/sidebar.vue';

export default {
	data () {
		return {
			title: config.title,
			subtitle: '',
			collapsed: false,
			init: 'core',
			menu: map2menu(routerMap),
		};
	},
	components: { vHeader, vSideBar },
	created () {
		eventBus.on('collapse', collapsed => {
			this.collapsed = collapsed;
		});
	},
	methods: {
		chooseRole (key, path) {
			console.log(key, path);
			return;
			if (key === 'core') this.$router.push('/test1');
			else if (key === 'distributor') this.$router.push('/test2');
			else if (key === 'supplier') this.$router.push('/test3');
		},
	}
}
/*
*/
</script>

<style>
html, body {
	height: 100%;
}
#app {
	height: 100%;
	background-color: rgb(75, 80, 85);
	font-family: 'Avenir', Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #2c3e50;
}

.no-select {
	user-select: none;
}
.no-event {
	pointer-events: none;
}
.cursor {
	cursor: pointer;
}
</style>