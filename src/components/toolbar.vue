<template>
	<div class="toolbar no-select">
		<div class="siteName"><img src="android-chrome-192x192.png"><span>{{title}}</span></div>
		<div class="ownerName">欢迎<span class="owner">{{ownerName}}<span class="ownerHint">{{ownerID}}</span></span></div>
		<div class="configer cursor" @click="toggleMenu"><i class="fa fas fa-cog"></i></div>
	</div>
</template>

<script>
import eventBus from './eventbus.js';
import config from '../config.js';

export default {
	name: "toolbar",
	data () {
		return {
			title: config.title,
			ownerName: '',
			ownerID: '',
		}
	},
	mounted () {
		eventBus.on('updateNodeInfo', info => {
			this.ownerName = info.name;
			this.ownerID = info.id;
		});
	},
	methods: {
		toggleMenu () {
			eventBus.emit('toggleConfigMenu');
		}
	}
};
</script>

<style scoped>
.toolbar {
	position: fixed;
	top: 0px;
	left: 0px;
	width: 100%;
	height: 50px;
	z-index: 5;
	background-color: rgb(22, 24, 35);
	box-shadow: rgba(127, 127, 127, 0.5) 0px 2px 2px 2px;
	color: white;
}
.toolbar .siteName {
	display: inline-block;
}
.toolbar .siteName img {
	position: relative;
	top: 5px;
	width: 40px;
	height: 40px;
	margin-left: 5px;
	margin-right: 10px;
}
.toolbar .siteName span {
	display: inline-block;
	font-size: 20px;
	line-height: 50px;
	vertical-align: top;
}
.toolbar .ownerName {
	display: inline-block;
	margin-left: 30px;
	line-height: 50px;
	vertical-align: top;
}
.toolbar .ownerName .owner {
	position: relative;
	margin-left: 5px;
}
.toolbar .ownerName .owner .ownerHint {
	position: absolute;
	box-sizing: border-box;
	top: 20px;
	left: 0px;
	height: 30px;
	padding: 2px 10px;
	background-color: black;
	box-shadow: inset 0px 0px 2px white;
	border-radius: 15px;
	font-size: 12px;
	line-height: 26px;
	opacity: 0;
	transition: opacity 250ms ease-in-out;
	pointer-events: none;
}
.toolbar .ownerName:hover .owner .ownerHint {
	opacity: 1;
	pointer-events: auto;
}
.toolbar .configer {
	position: absolute;
	top: 0px;
	right: 0px;
	height: 50px;
	padding-left: 20px;
	padding-right: 20px;
	line-height: 50px;
}
</style>