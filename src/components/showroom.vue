<template>
	<div class="showroom">
	</div>
</template>

<script>
import eventBus from './eventbus.js';

export default {
	name: "showroom",
	data () {
		return {
		}
	},
	mounted () {
		eventBus.on('updateItems', info => {
			console.log(info);
		});
	},
	methods: {
		collapse (c) {
		},
		updateSize () {
		}
	}
};
</script>

<style scoped>
.showroom {
	position: fixed;
	top: 50px;
	bottom: 0px;
	left: 0px;
	width: 100%;
	z-index: 0;
	/*background-color: rgb(22, 24, 35);*/
	background-color: rgb(0, 0, 0);
}
</style>