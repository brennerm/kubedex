<script lang="ts">
	import api from '$lib/swagger.json';
	import { resolveSchema, getTopLevelDefinitionNames, getOriginalDefinitionName, type ResolvedSchema } from '$lib/schemaResolver';
	import PropertyTree from '$lib/PropertyTree.svelte';

	let searchTerm = $state('');
	let selectedDefinition = $state<string | null>(null);
	let resolvedSchema = $state<ResolvedSchema | null>(null);
	let error = $state<string | null>(null);

	// Get only top-level definition names (not referenced by others)
	const allDefinitions = getTopLevelDefinitionNames(api.definitions);

	// Filter definitions based on search
	let filteredDefinitions = $derived(
		searchTerm
			? allDefinitions.filter((def) => def.toLowerCase().includes(searchTerm.toLowerCase()))
			: allDefinitions
	);

	// Resolve schema when definition is selected
	$effect(() => {
		if (selectedDefinition) {
			try {
				// Convert formatted name back to original definition name
				const originalName = getOriginalDefinitionName(selectedDefinition, api.definitions);
				if (!originalName) {
					throw new Error(`Could not find definition for "${selectedDefinition}"`);
				}
				resolvedSchema = resolveSchema(originalName, api.definitions);
				// Update the display name to use formatted version
				// resolvedSchema.name = selectedDefinition;
				error = null;
			} catch (e) {
				error = e instanceof Error ? e.message : 'Unknown error';
				resolvedSchema = null;
			}
		} else {
			resolvedSchema = null;
			error = null;
		}
	});
</script>

<div class="min-h-screen bg-base-200">
	<div class="container mx-auto p-6 max-w-7xl">
		<!-- Hero Section -->
		<div class="hero bg-base-100 rounded-box shadow-lg mb-6">
			<div class="hero-content text-center py-12">
				<div class="max-w-2xl">
					<h1 class="text-5xl font-bold mb-4">kubedex</h1>
					<p class="text-lg text-base-content/70">
						Explore Kubernetes API resources with their complete property definitions
					</p>
				</div>
			</div>
		</div>

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
						class="input input-bordered input-primary w-full"
						bind:value={searchTerm}
					/>
					<div class="label">
						<span class="label-text-alt">
							<span class="badge badge-neutral badge-sm">{filteredDefinitions.length}</span>
							resources found
						</span>
					</div>
				</div>

				<div class="form-control">
					<label for="resource-select" class="label">
						<span class="label-text font-semibold">Resource definition</span>
					</label>
					<select
						id="resource-select"
						class="select select-bordered select-primary w-full"
						bind:value={selectedDefinition}
					>
						<option value={null}>-- Select a resource --</option>
						{#each filteredDefinitions as def}
							<option value={def}>{def}</option>
						{/each}
					</select>
				</div>
			</div>
		</div>

		<!-- Error Alert -->
		{#if error}
			<div role="alert" class="alert alert-error shadow-lg mb-6">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="stroke-current shrink-0 h-6 w-6"
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
				<span>{error}</span>
			</div>
		{/if}

		<!-- Schema Display -->
		{#if resolvedSchema}
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title text-3xl mb-4">
						<span class="badge badge-primary badge-lg font-mono">{resolvedSchema.name}</span>
					</h2>

					{#if resolvedSchema.description}
						<div role="alert" class="alert alert-info mb-6">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								class="stroke-current shrink-0 w-6 h-6"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								></path>
							</svg>
							<span>{resolvedSchema.description}</span>
						</div>
					{/if}

					<div class="divider divider-primary">
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
</div>
