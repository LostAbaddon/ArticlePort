<template>
	<div class="toolbar no-select">
		<div class="siteName"><img src="android-chrome-192x192.png"><span>{{title}}</span></div>
		<div class="ownerName">欢迎<span class="owner">{{ownerName}}<span class="ownerHint">{{ownerID}}</span></span></div>
		<div class="articleTitle">{{articleTitle}}</div>
		<div class="closer cursor" @click="closeArticle" :shown="!!articleTitle ? 'true' : 'false'"><i class="fa fas fa-window-close"></i></div>
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
			articleTitle: ''
		}
	},
	mounted () {
		eventBus.on('updateNodeInfo', info => {
			this.ownerName = info.name;
			this.ownerID = info.id;
		});
		eventBus.on('showArticleTitle', title => {
			this.articleTitle = title;
		});
		eventBus.on('hideArticleTitle', title => {
			this.articleTitle = '';
		});
	},
	methods: {
		toggleMenu () {
			eventBus.emit('toggleConfigMenu');
		},
		closeArticle () {
			eventBus.emit('hideArticle');
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
.toolbar .articleTitle {
	position: absolute;
	display: block;
	top: 0px;
	left: 50px;
	right: 50px;
	font-size: 26px;
	font-weight: bolder;
	line-height: 50px;
	text-align: center;
	vertical-align: top;
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
	transition: left 250ms ease-in-out;
}
.toolbar .configer,
.toolbar .closer {
	position: absolute;
	top: 0px;
	height: 50px;
	padding-left: 20px;
	padding-right: 20px;
	line-height: 50px;
}
.toolbar .configer {
	right: 0px;
}
.toolbar .closer {
	right: 100px;
	opacity: 0;
	pointer-events: none;
	transition: all 250ms ease-in-out;
}
.toolbar .closer[shown="true"] {
	right: 50px;
	opacity: 1;
	pointer-events: auto;
}
@media(max-width: 1500px) {
	.toolbar .articleTitle {
		left: 350px;
	}
}
</style>