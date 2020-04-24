<template>
	<div class="toc-frame scroller">
		<div class="toc-container">
			<div v-for="item in list" :class="'toc-item level-'+item.level">
				<a :href="item.link">{{item.title}}</a>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: "toc",
	data () {
		return {
		}
	},
	props: {
		list: {
			type: Array,
			default: () => []
		}
	}
};
</script>

<style scoped>
.toc-frame {
	position: absolute;
	box-sizing: border-box;
	top: 10px;
	bottom: 10px;
	left: 5px;
	right: 50%;
	margin-right: 450px;
	padding-right: 20px;
	z-index: 1;
	background-color: transparent;
	text-align: right;
	overflow-y: auto;
	opacity: 1;
	transition: all 250ms ease-in-out;
}
@media(max-width: 1200px) {
	.toc-frame {
		opacity: 0;
		pointer-events: none;
	}
}
.toc-frame .toc-container {
	display: inline-block;
	text-align: left;
}
.toc-frame .toc-item.level-1 {
	margin-top: 15px;
	font-size: 16px;
	font-weight: bolder;
}
.toc-frame .toc-item.level-2 {
	margin-top: 5px;
	padding-left: 10px;
	font-size: 14px;
}
.toc-frame .toc-item a,
.toc-frame .toc-item a:hover,
.toc-frame .toc-item a:visited {
	text-decoration: none;
	transition: all ease-in-out 250ms;
}
.toc-frame .toc-item a,
.toc-frame .toc-item a:visited {
	color: rgb(127, 127, 127);
}
.toc-frame .toc-item a:hover {
	color: rgb(225, 225, 225);
}
</style>