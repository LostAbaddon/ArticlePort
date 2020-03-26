<template>
	<div class="menubar-container"
		:class="[collapsed?'collapsed':'uncollapsed', !!level?'menubar-submenu':'', 'submenu-level-'+level]"
		:style="{width:(collapsed&&level===0?minWidth:width)+'px'}">
		<menubar-item v-for="item in menu" ref="menuItem"
			:name="item.name" :id="!!item.key?item.key:item.name" :icon="item.icon"
			:to="item.to"
			:collapsed="collapsed"
			:width="width" :height="height"
			:disabled="!!item.disabled" :selected="(!!item.key?item.key:item.name)===menuKey"
			:showNext="showNext" :hideNext="hideNext"
			:subs="item.subs" :level="level"
			@clickSubMenu="clickSubMenu" @click="clickItem" />
	</div>
</template>

<script>
export default {
	name: 'menubar',
	data () {
		return {
			menuKey: '',
		}
	},
	props: {
		initKey: String,
		menu: {
			type: Array,
			default: []
		},
		width: {
			type: Number,
			default: 100
		},
		minWidth: {
			type: Number,
			default: 30
		},
		height: {
			type: Number,
			default: 50
		},
		collapsed: {
			type: Boolean,
			default: false
		},
		showNext: {
			type: String,
			default: 'fas fa-angle-double-down'
		},
		hideNext: {
			type: String,
			default: 'fas fa-angle-double-up'
		},
		level: {
			type: Number,
			default: 0
		}
	},
	computed: {
		menuHeight () {
			if (this.collapsed) return 0;
			var height = 0;
			var items = this.$refs.menuItem;
			if (!items) return 0;
			items.forEach(item => {
				height += item.barHeight;
			});
			return height;


			if (!this.subs) return this.height;
			return this.height * this.subs.length + this.height;
		},
	},
	mounted () {
		this.menuKey = this.initKey;
	},
	methods: {
		clickSubMenu (submenu) {
			this.$emit('clickSubMenu', submenu, this);
		},
		clickItem (key, path, item, menu) {
			var current = path[path.length - 1];
			this.menu.some(menu => {
				var k = menu.key || menu.name;
				if (k === current) {
					this.menuKey = current;
					return true;
				}
			});
			this.$emit('click', key, path, item, this);
		},
		closeSubMenu () {
			var items = this.$refs.menuItem;
			if (!items) return 0;
			items.forEach(item => {
				if (!item.subs) return;
				item.closeSubMenu();
				item.updateSubMenu();
			});
		},
	},
}
</script>

<style>
.menubar-container {
	position: relative;
}
.menubar-container.collapsed .menubar-item-submenu > .menubar-container {
	position: absolute;
	top: 0px;
	left: 100%;
}
</style>