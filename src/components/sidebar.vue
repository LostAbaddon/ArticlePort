<template>
	<div class="sidebar no-select" :class="collapsed?'collapsed':''">
		<div v-if="showMask" class="clickMask" @click="closeAll"></div>
		<menubar ref="menuBar"
			:width="250" :minWidth="50"
			:collapsed="collapsed"
			:initKey="initKey"
			:menu="menu"
			@click="clickItem"></menubar>
	</div>
</template>

<script>
import eventBus from './eventbus.js';

export default {
	data () {
		return {
			collapsed: false,
			showMask: false,
		}
	},
	props: {
		initKey: String,
		menu: {
			type: Array,
			default: []
		},
	},
	created () {
		eventBus.on('collapse', collapsed => {
			this.collapsed = collapsed;
			this.$refs.menuBar.closeSubMenu();
		});
	},
	methods: {
		clickItem (key, path, item, menu) {
			this.$emit('click', key, path, item, menu);
			if (!this.collapsed) return;
			if (!item.subs) return;
			this.showMask = true;
		},
		closeAll () {
			if (!this.showMask) return;
			this.showMask = false;
			this.$refs.menuBar.closeSubMenu();
		}
	},
}
</script>

<style>
.sidebar {
	display: block;
	position: absolute;
	left: 0;
	top: 50px;
	bottom: 0;
	width: 250px;
	overflow-x: hidden;
	overflow-y: scroll;
	background-color: rgb(0, 27, 53);
	box-shadow: rgba(127, 127, 127, 0.5) 0px 2px 2px 2px;
	transition: width 250ms ease-in-out;
}
.sidebar::-webkit-scrollbar {
	width: 0;
}
.sidebar.collapsed {
	width: 50px;
	overflow: visible;
}

.sidebar .clickMask {
	position: fixed;
	top: 0px;
	left: 0px;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.1);
}

.sidebar .menubar-container .menubar-item {
	color: white;
}

.sidebar .menubar-container .menubar-item-title {
	box-shadow: inset rgba(112, 243, 255, 0) 0px 0px 0px 0px;
	transition: box-shadow 250ms ease-in-out;
}
.sidebar .menubar-container .menubar-item.selected > .menubar-item-title {
	box-shadow: inset rgba(112, 243, 255, 1) 8px 0px 4px -4px;
}
.sidebar .menubar-container.uncollapsed.submenu-level-1 .menubar-item-title {
	padding-left: 20px;
}
.sidebar .menubar-container.uncollapsed.submenu-level-2 .menubar-item-title {
	padding-left: 40px;
}
.sidebar .menubar-container.uncollapsed.submenu-level-3 .menubar-item-title {
	padding-left: 60px;
}

.sidebar .menubar-container.collapsed .menubar-item-submenu > .menubar-container {
	background-color: black;
	background-color: rgb(0, 27, 53);
	box-shadow: rgba(53, 53, 53, 0.6) 3px 3px 5px;
}
</style>