<template>
	<div class="menubar-item"
		:class="[disabled?'disabled':'', selected?'selected':'']"
		:style="{height:itemHeight+'px',lineHeight:height+'px'}"
		@click="chooseItem">
		<span class="menubar-item-title" :style="{height:height+'px'}">
			<i class="menubar-item-icon" :class="icon">{{collapsed&&level===0?'':name}}</i>
		</span>
		<template v-if="!!subs&&subs.length>0">
			<span v-if="!collapsed||level>0" class="menubar-item-showmore"><i :class="!!expanded?hideNext:showNext" /></span>
			<div class="menubar-item-submenu" :style="{height:subHeight+'px'}" :class="!!expanded?'expanded':''">
				<menubar ref="subMenu"
					:menu="subs"
					:width="width" :minWidth="width"
					:collapsed="collapsed"
					:level="level+1"
					@clickSubMenu="clickSubMenu" @click="clickItem" />
			</div>
		</template>
	</div>
</template>

<script>
import menubar from './index.vue';
export default {
	name: 'menubarItem',
	data () {
		return {
			expanded: false,
			subHeight: 0,
			itemHeight: 0,
			clkSub: false,
		}
	},
	props: {
		name: String,
		id: String,
		icon: String,
		width: Number,
		disabled: Boolean,
		selected: Boolean,
		collapsed: Boolean,
		showNext: String,
		hideNext: String,
		height: Number,
		subs: Array,
		to: String,
		level: 0
	},
	computed: {
		barHeight () {
			if (!this.expanded) return this.height;
			if (!this.subs) return this.height;
			var subMenu = this.$refs.subMenu;
			if (!subMenu) return this.height;
			return subMenu.menuHeight + this.height;
		},
	},
	watch: {
		selected (nVal, oVal) {
			if (nVal) return;
			this.closeSubMenu();
		},
	},
	mounted () {
		this.updateSubMenu();
	},
	methods: {
		chooseItem () {
			var isClick = false;
			if (!!this.subs) {
				let clkSub = this.clkSub;
				if (clkSub) {
					this.clkSub = false;
				}
				else {
					this.expanded = !this.expanded;
				}
				this.$emit('clickSubMenu', this);
				this.updateSubMenu();
				if (!clkSub) {
					isClick = true;
				}
			}
			else {
				this.$emit('clickSubMenu', this);
				if (this.clkSub) {
					this.clkSub = false;
				}
				else {
					isClick = true;
				}
			}
			if (isClick) {
				this.clickItem(this.id, [], this, null);
				if (!this.to) return;
				this.$router.push(this.to);
			}
		},
		updateSubMenu () {
			var h = 0;
			if (this.expanded) h = this.barHeight - this.height;
			this.subHeight = h;
			this.itemHeight = h + this.height;
		},
		clickSubMenu (barItem, subMenu) {
			this.clkSub = true;
		},
		clickItem (key, path, item, menu) {
			path.push(this.id);
			this.$emit('click', key, path, item, menu);
		},
		closeSubMenu () {
			if (!this.subs) return;
			var sub = this.$refs.subMenu;
			if (!sub) return;
			sub.menuKey = '';
			this.expanded = false;
			sub.closeSubMenu();
			this.updateSubMenu();
		},
	},
}
</script>

<style>
.menubar-item {
	position: relative;
	text-align: left;
	font-size: 16px;
	cursor: pointer;
	transition: all 250ms ease-in-out;
}
.menubar-item.disabled > .menubar-item-title {
	color: grey;
	user-select: none;
	cursor: not-allowed;
}
.menubar-item.selected > .menubar-item-title {
	color: rgb(112, 243, 255);
}
.menubar-item .menubar-item-title {
	display: block;
	position: relative;
	width: 100%;
}
.menubar-item .menubar-item-icon:before {
	display: inline-block;
	width: 16px;
	margin-left: 17px;
	margin-right: 17px;
	text-align: center;
}
.menubar-item .menubar-item-showmore {
	position: absolute;
	top: 0px;
	right: 17px;
}
.menubar-item .menubar-item-submenu {
	opacity: 0;
	overflow: hidden;
	transition: height 250ms ease-in-out, opacity 250ms ease-in-out;
	pointer-events: none;
}
.menubar-container.collapsed .menubar-item .menubar-item-submenu {
	overflow: visible;
}
.menubar-item .menubar-item-submenu.expanded {
	opacity: 1;
	pointer-events: auto;
}
</style>