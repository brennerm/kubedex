<script lang="ts">
	import api from '$lib/apis/k8s/1.34/swagger.json';
	import { resolveSchema, getTopLevelDefinitionNames, getOriginalDefinitionName, type ResolvedSchema, formatDefinitionName } from '$lib/schemaResolver';
	import PropertyTree from '$lib/PropertyTree.svelte';
	import { k8sApi } from '$lib/k8s-api.svelte';

	let searchTerm = $state('');
	let selectedDefinition = $state<string | null>(null);
	let resolvedSchema = $derived.by<ResolvedSchema | null>(() => {
		if (selectedDefinition) {
			try {
				// Convert formatted name back to original definition name
				const originalName = getOriginalDefinitionName(selectedDefinition, api.definitions);
				if (!originalName) {
					throw new Error(`Could not find definition for "${selectedDefinition}"`);
				}
				return resolveSchema(originalName, api.definitions);
			} catch (e) {
				return null;
			}
		} else {
			return null;
		}
	});

  const allDefinitions = $derived(getTopLevelDefinitionNames(k8sApi.getDefinitions()))

	// Filter definitions based on search
	let filteredDefinitions = $derived(
		searchTerm
			? allDefinitions.filter((def) => def.toLowerCase().includes(searchTerm.toLowerCase()))
			: allDefinitions
	);
</script>

	<div class="container mx-auto p-6 max-w-7xl">
		<!-- Search and Select Section -->
		<div class="card bg-base-100 shadow-xl mb-6">
			<div class="card-body">
				<h2 class="card-title text-2xl mb-4">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					Select a Resource
				</h2>

				<div class="form-control mb-4">
					<label for="search" class="label">
						<span class="label-text font-semibold">Search resources</span>
					</label>
					<input
						id="search"
						type="text"
						placeholder="Type to filter resources..."
						class="input input-bordered w-full"
						bind:value={searchTerm}
					/>
				</div>

				<div class="form-control">
					<label for="resource-select" class="label">
						<span class="label-text font-semibold">Resource definition</span>
					</label>
					<select
						id="resource-select"
						class="select select-bordered w-full"
						bind:value={selectedDefinition}
					>
						<option value={null}>-- Select a resource ({filteredDefinitions.length}) --</option>
						{#each filteredDefinitions as def}
							<option value={def}>{def}</option>
						{/each}
					</select>
				</div>
			</div>
		</div>

		<!-- Schema Display -->
		{#if resolvedSchema}
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title text-xl mb-4">
						<span class="font-mono">{formatDefinitionName(resolvedSchema.name)}</span>
					</h2>

					{#if resolvedSchema.description}
						<p class="mb-6 whitespace-pre-wrap">
							{resolvedSchema.description}
            </p>
					{/if}

					<div class="divider">
						<span class="text-lg font-semibold">Properties</span>
					</div>

					{#if resolvedSchema.properties.length > 0}
						<div class="overflow-x-auto">
							{#each resolvedSchema.properties as property}
								<PropertyTree {property} />
							{/each}
						</div>
					{:else}
						<div role="alert" class="alert alert-warning">
							<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
							<span>No properties defined for this resource.</span>
						</div>
					{/if}
				</div>
			</div>
		{:else if !selectedDefinition}
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body items-center text-center py-16">
					<div class="w-32 h-32 mb-6 opacity-20">
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
					<h3 class="text-2xl font-bold mb-3">Select a resource to explore</h3>
					<p class="text-base-content/60 max-w-md">
						Choose a Kubernetes resource from the dropdown above to view its complete schema with all nested properties and descriptions.
					</p>
				</div>
			</div>
		{/if}
	</div>