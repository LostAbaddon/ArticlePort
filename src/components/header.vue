<template>
	<div class="header no-select" :class="collapsed?'collapsed':''">
		<!-- 折叠按钮 -->
		<div class="collapse-bar">
			<van-icon
				class-prefix="fas fa" :name="collapsed?'chevron-circle-right':'chevron-circle-left'"
				class="button cursor"
				@click="collapse(!collapsed)"><span>收缩</span></van-icon>
		</div>
		<div class="title">{{title}}<span v-if="!!subtitle" class="subtitle">（ {{subtitle}} ）</span></div>
	</div>
</template>

<script>
import eventBus from './eventbus.js';

export default {
	data () {
		return {
			collapsed: false
		}
	},
	props: {
		title: {
			type: String,
			default: ''
		},
		subtitle: {
			type: String,
			default: ''
		}
	},
	mounted () {
		this.updateSize();
		if (!window.__resize_inited) {
			window.__resize_inited = true;
			let timer = null;
			window.onresize = () => {
				if (!!timer) clearTimeout(timer);
				timer = setTimeout(() => {
					timer = null;
					this.updateSize();
				}, 200);
			};
		}
	},
	methods: {
		collapse (c) {
			this.collapsed = c;
			eventBus.emit('collapse', this.collapsed);
		},
		updateSize () {
			var width = window.innerWidth || document.body.offsetWidth || window.screen.availWidth;
			if (width >= 900) this.collapse(false);
			else this.collapse(true);
		}
	}
};
</script>

<style scoped>
.header {
	position: relative;
	height: 50px;
	background-color: rgb(0, 27, 53);
	box-shadow: rgba(127, 127, 127, 0.5) 0px 2px 2px 2px;
	color: white;
	text-align: left;
}
.collapse-bar {
	position: absolute;
	width: 250px;
	height: 50px;
	padding: 0px;
	box-sizing: border-box;
	line-height: 50px;
	transition: width 250ms ease-in-out
}
.collapsed .collapse-bar {
	width: 50px;
}
.collapse-bar:after {
	content: '';
	position: absolute;
	right: 0px;
	top: 5px;
	bottom: 5px;
	display: block;
	width: 1px;
	background-color: rgb(175, 175, 175);
	background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.5) 30%, rgba(255, 255, 255, 0.5) 70%, rgba(255, 255, 255, 0) 100%);
}
.collapse-bar .button:before {
	margin-left: 17px;
	margin-right: 17px;
}
.collapse-bar .button span {
	position: absolute;
	display: block;
	top: 17px;
	left: 50px;
	width: 80px;
	transition: opacity 250ms ease-in-out
}
.collapsed .collapse-bar .button span {
	opacity: 0;
	pointer-events: none;
}

.title {
	position: absolute;
	top: 0px;
	left: 270px;
	height: 50px;
	line-height: 50px;
	transition: left 250ms ease-in-out;
}
.collapsed .title {
	left: 70px;
}
.title .subtitle {
	margin-left: 10px;
	font-size: 14px;
}
</style>