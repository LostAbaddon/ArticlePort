<template>
	<div id="LoadMask" :class="show ? 'shown' : ''" @click="click">
		<van-loading color="white" v-if="!onlyMask">加载中</van-loading>
	</div>
</template>

<script>
import eventBus from './eventbus.js';

export default {
	name: "loadMask",
	data () {
		return {
			show: false,
			onlyMask: false
		}
	},
	mounted () {
		eventBus.on('loadStart', () => {
			LoadMask.style.zIndex = 10000;
			this.show = true;
			this.onlyMask = false;
		});
		eventBus.on('loadFinish', () => {
			this.show = false;
			this.onlyMask = false;
		});
		eventBus.on('showMask', () => {
			LoadMask.style.zIndex = 1;
			this.show = true;
			this.onlyMask = true;
		});
		eventBus.on('hideMask', () => {
			this.show = false;
			eventBus.emit('maskHidden');
		});
	},
	methods: {
		click () {
			if (!this.onlyMask) return;
			eventBus.emit('hideMask');
		}
	}
};
</script>

<style scoped>
#LoadMask {
	position: fixed;
	display: block;
	box-sizing: border-box;
	top: 0px;
	left: 0px;
	width: 100%;
	height: 100%;
	background-color: rgba(22, 24, 35, 0);
	pointer-events: none;
	transition: all 250ms ease-in-out;
}
#LoadMask.shown {
	background-color: rgba(22, 24, 35, 0.6);
	pointer-events: auto;
}
#LoadMask .van-loading {
	position: absolute;
	display:block;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	opacity: 0;
	transition: opacity 250ms ease-in-out;
}
#LoadMask.shown .van-loading {
	opacity: 1;
}
#LoadMask .van-loading .van-loading__text {
	font-size: 20px;
	color: white;
}
</style>