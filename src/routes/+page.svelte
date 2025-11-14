<script lang="ts">
	import {
		resolveSchema,
		getTopLevelDefinitionNames,
		getOriginalDefinitionName,
		type ResolvedSchema,
		formatDefinitionName
	} from '$lib/schemaResolver';
	import PropertyTree from '$lib/PropertyTree.svelte';
	import { k8sApi } from '$lib/k8s-api.svelte';
	import { filterProperties } from '$lib/fuzzySearch';
	import Svelecte from 'svelecte';
	import { debounce } from '$lib';

	let propertyFilter = $state('');
	let selectedDefinition = $state<string | null>(null);

	let resolvedSchema = $derived.by<ResolvedSchema | null>(() => {
		if (selectedDefinition && k8sApi.isLoaded) {
			try {
				const definitions = k8sApi.getDefinitions();
				// Convert formatted name back to original definition name
				const originalName = getOriginalDefinitionName(selectedDefinition, definitions);
				if (!originalName) {
					return null;
				}
				return resolveSchema(originalName, definitions);
			} catch (e) {
				return null;
			}
		} else {
			return null;
		}
	});

	const allDefinitions = $derived(
		k8sApi.isLoaded ? getTopLevelDefinitionNames(k8sApi.getDefinitions()) : []
	);
</script>

<div class="container mx-auto max-w-7xl p-6">
	<!-- Loading State -->
	{#if k8sApi.isLoading}
		<div class="card mb-6 bg-base-100 shadow-xl">
			<div class="card-body items-center py-16 text-center">
				<span class="loading loading-lg loading-spinner text-primary"></span>
				<p class="mt-4 text-lg">Loading Kubernetes {k8sApi.selectedVersion} API schema...</p>
			</div>
		</div>
	{:else if k8sApi.error}
		<div role="alert" class="mb-6 alert alert-error shadow-lg">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6 shrink-0 stroke-current"
				fill="none"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span>{k8sApi.error}</span>
		</div>
	{:else}
		<!-- Search and Select Section -->
		<div class="card mb-6 bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="mb-4 card-title text-2xl">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
					Select a Resource
				</h2>

				<div class="form-control">
					<label for="resource-select" class="label">
						<span class="label-text font-semibold">Resource definition</span>
					</label>
					<Svelecte
						options={allDefinitions}
						bind:value={selectedDefinition}
						placeholder="Type to filter {allDefinitions.length} resources..."
					></Svelecte>
				</div>
			</div>
		</div>

		<!-- Schema Display -->
		{#if resolvedSchema}
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="mb-4 card-title text-xl">
						<span class="font-mono">{formatDefinitionName(resolvedSchema.name)}</span>
					</h2>

					{#if resolvedSchema.description}
						<p class="whitespace-pre-wrap">
							{resolvedSchema.description}
						</p>
					{/if}

					<div class="divider">
						<span class="text-lg font-semibold">Properties</span>
					</div>

					<div class="form-control mb-4 max-w-lg">
						<input
							id="property-filter"
							type="text"
							placeholder="Type to filter properties..."
							class="input-bordered input w-full"
							onkeyup={debounce((event: KeyboardEvent) => propertyFilter = (event.target as HTMLInputElement).value)}
						/>
					</div>

					{#if resolvedSchema.properties.length > 0}
						<div class="overflow-x-auto">
							{#each filterProperties(resolvedSchema.properties, propertyFilter) as property}
								<PropertyTree {property} />
							{/each}
						</div>
					{:else}
						<div role="alert" class="alert alert-warning">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-6 w-6 shrink-0 stroke-current"
								fill="none"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
							<span>No properties defined for this resource.</span>
						</div>
					{/if}
				</div>
			</div>
		{:else if !selectedDefinition}
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body items-center py-16 text-center">
					<div class="mb-6 h-32 w-32 opacity-20">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
					</div>
					<h3 class="mb-3 text-2xl font-bold">Select a resource to explore</h3>
					<p class="max-w-md text-base-content/60">
						Choose a Kubernetes resource from the dropdown above to view its complete schema with
						all nested properties and descriptions.
					</p>
				</div>
			</div>
		{/if}
	{/if}
</div>
