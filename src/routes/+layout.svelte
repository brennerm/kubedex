<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.png';
	import Icon from '@iconify/svelte';
	import { k8sApi } from '$lib/k8s-api.svelte';
	import { dev } from '$app/environment';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>kubedex - Kubernetes Resource Explorer</title>
	<description>
		Explore Kubernetes API resources with their complete property definitions
	</description>
	{#if !dev}
		<script
			defer
			src="https://cloud.umami.is/script.js"
			data-website-id="bc3a9c32-84d9-4d90-ab17-686777f961b8"
		></script>
	{/if}
</svelte:head>

<div class="navbar bg-base-100">
	<div class="flex-1">
		<span class="btn text-2xl btn-ghost">
			<Icon icon="catppuccin:folder-kubernetes-open" width="32" height="32" />
			kubedex
		</span>
	</div>

	<div class="flex items-center gap-x-2">
		<span class="text-nowrap">Kubernetes</span>
		<select
			class="select"
			value={k8sApi.selectedVersion}
			onchange={async (e) => {
				await k8sApi.setSelectedVersion((e.target as HTMLSelectElement).value);
			}}
			disabled={k8sApi.isLoading}
		>
			{#each k8sApi.availableVersions as version}
				<option value={version}>{version}</option>
			{/each}
		</select>
	</div>
</div>

<div class="mx-8 min-h-[calc(100vh-4rem)] bg-base-200">
	{@render children()}
</div>
