<template>
	<div>
		Number1: {{value}}
	</div>
</template>

<script>
export default {
	data () {
		return {
			value: 'Sales-D-' + Math.floor(Math.random() * 100)
		}
	},
	created () {
		this.value = 'Sales-C-' + Math.floor(Math.random() * 100);
	},
	mounted () {
		this.value = 'Sales-M-' + Math.floor(Math.random() * 100);
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