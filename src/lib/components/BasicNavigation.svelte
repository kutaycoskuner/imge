<script lang="ts">
	import { base } from '$app/paths';
	import * as config from '$lib/config';
	import { KEYBOARD_ONLY } from '$lib/site';
</script>

<!-- src/lib/components/Nav.svelte; none on the keyboard-only site ($lib/site.ts) -->
{#if !KEYBOARD_ONLY}
<nav>
	<a href="{base}/">graph editor</a>
	<a href="{base}/matrix_addition">matrix calculator</a>
	<a href="{base}/csv_editor">csv editor</a>
	<a href="{base}/keyboard_layout">keyboard layout</a>
	<!-- <a href="{base}/keyframe">motion animation</a>
	<a href="{base}/pixel">pixel shader</a> -->

	<!-- <a href="{base}/about">about</a> -->
	<!-- <a href="{base}/blog">blog</a> -->
	<!-- <a href="{base}/api/posts">md_api</a> -->
	<!-- <a href="{base}/_test/deeply/nested/route">nesting test</a> -->
</nav>
{/if}

<!-- <style>
	nav {
		background-color: #333;
		color: white;
		padding: 1rem;
	}
	ul {
		display: flex;
		list-style: none;
		gap: 1rem;
	}
	a {
		color: white;
		text-decoration: none;
	}
	a:hover {
		text-decoration: underline;
	}
</style> -->

<style>
	nav {
		position: fixed;
		margin: 0;
		margin-left: 0.5rem;
		padding: 0;
		top: 0;
		left: 0;
		z-index: 90;
	}
</style>
