<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.png';
	import Icon from '@iconify/svelte';
	import { k8sApi } from '$lib/k8s-api.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>kubedex - Kubernetes Resource Explorer</title>
	<description>
		Explore Kubernetes API resources with their complete property definitions
	</description>
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
		<select class="select" bind:value={k8sApi.selectedVersion}>
			{#each k8sApi.availableVersions as version}
				<option>{version}</option>	
			{/each}
		</select>
	</div>
</div>

<div class="mx-8 min-h-[calc(100vh-4rem)] bg-base-200">
	{@render children()}
</div>
