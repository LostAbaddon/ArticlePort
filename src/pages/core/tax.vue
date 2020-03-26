<template>
	<div>
		Number1: {{value}}
	</div>
</template>

<script>
export default {
	data () {
		return {
			value: 'Tax-D-' + Math.floor(Math.random() * 100)
		}
	},
	created () {
		this.value = 'Tax-C-' + Math.floor(Math.random() * 100);
	},
	mounted () {
		this.value = 'Tax-M-' + Math.floor(Math.random() * 100);
	}
}
</script>

<style scoped>
div {
	padding: 20px;
	box-sizing: border-box;
	color: white;
}
</style>