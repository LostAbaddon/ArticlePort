<template>
	<div class="image-wall-container" :shown="show ? 'true' : 'false'">
		<div class="closer" @click="closeMe"><i class="fa fas fa-times"></i></div>
		<div class="nav-button left"
			v-if="imageList.length > 1"
			:available="current > 0 ? 'true' : 'false'"
			@click="movePrev"><i class="fa fas fa-chevron-left"></i></div>
		<div class="nav-button right"
			v-if="imageList.length > 1"
			:available="current < imageList.length - 1 ? 'true' : 'false'"
			@click="moveNext"><i class="fa fas fa-chevron-right"></i></div>
		<image-cabinet v-for="(item, index) in imageList" :url="item.image" :caption="item.caption" :index="index" :style="{left: ((index - current) * 100) + '%'}"></image-cabinet>
	</div>
</template>

<script>
import eventBus from './eventbus.js';
import singleimage from './singleimage.vue';

export default {
	name: "imageWall",
	data () {
		return {
			show: false,
			imageList: [],
			current: 0
		}
	},
	components: {
		imageCabinet: singleimage
	},
	mounted () {
		eventBus.on('showImageWall', (list, index) => {
			this.show = true;
			this.imageList.splice(0, this.imageList.length, ...list);
			this.current = index;
		});
		eventBus.on('hideImageWall', (list, index) => {
			this.show = false;
			eventBus.emit('imageWallHidden');
		});
		eventBus.on('turnPrevImage', (list, index) => {
			if (this.current > 0) this.current --;
		});
		eventBus.on('turnNextImage', (list, index) => {
			if (this.current < this.imageList.length - 1) this.current ++;
		});
	},
	methods: {
		closeMe () {
			this.show = false;
			eventBus.emit('imageWallHidden');
		},
		movePrev () {
			this.current --;
		},
		moveNext () {
			this.current ++;
		}
	}
};
</script>

<style scoped>
.image-wall-container {
	position: fixed;
	display: block;
	box-sizing: border-box;
	top: 0px;
	left: -100%;
	width: 100%;
	height: 100%;
	z-index: 10;
	overflow: hidden;
	background-color: rgba(61, 59, 79, 0);
	transition: all 250ms ease-in-out
}
.image-wall-container[shown="true"] {
	left: 0px;
	background-color: rgba(49, 37, 32, 0.75);
}
.image-wall-container .closer {
	position: absolute;
	top: 0px;
	right: 0px;
	width: 40px;
	height: 40px;
	font-size: 36px;
	z-index: 1;
	text-align: center;
	cursor: pointer;
}
.image-wall-container .nav-button {
	position: absolute;
	top: 50%;
	z-index: 1;
	transform: translateY(-50%);
	font-size: 50px;
	cursor: pointer;
	opacity: 0;
	transition: all 250ms ease-in-out;
	pointer-events: none;
}
.image-wall-container .nav-button[available="true"] {
	opacity: 0.5;
	pointer-events: auto;
}
.image-wall-container .nav-button:hover {
	opacity: 1;
}
.image-wall-container .nav-button.left {
	left: 0px;
}
.image-wall-container .nav-button.left[available="true"] {
	left: 10px;
}
.image-wall-container .nav-button.right {
	right: 0px;
}
.image-wall-container .nav-button.right[available="true"] {
	right: 10px;
}
</style>