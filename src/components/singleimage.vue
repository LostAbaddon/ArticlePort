<template>
	<div class="image-cabinet">
		<div class="image-content" :style="{backgroundImage: 'url(' + url + ')'}"></div>
		<figcaption>{{caption}}</figcaption>
	</div>
</template>

<script>
export default {
	name: "imageCabinet",
	data () {
		return {
		}
	},
	props: {
		url: {
			type: String,
			default: ''
		},
		caption: {
			type: String,
			default: ''
		}
	},
	methods: {
	}
};
</script>

<style scoped>
.image-cabinet {
	position: absolute;
	left: 0px;
	top: 0px;
	width: 100%;
	height: 100%;
	z-index: 0;
	transition: all 250ms ease-in-out;
}
.image-cabinet .image-content {
	position: absolute;
	top: 30px;
	bottom: 30px;
	left: 30px;
	right: 30px;
	background-position: center center;
	background-repeat: no-repeat;
	background-size: contain;
}
.image-cabinet figcaption {
	position: absolute;
	bottom: 0px;
	left: 0px;
	width: 100%;
	padding: 20px 10px;
	background-color: rgb(22, 24, 35, 0.8);
	font-size: 20px;
	line-height: 24px;
	text-align: center;
	word-break: break-word;
}
</style>