<script lang="ts">
	import { formatDefinitionName, getPropertiesCount, type PropertyInfo } from './schemaResolver';
	import PropertyTree from './PropertyTree.svelte';

	interface Props {
		property: PropertyInfo;
		level?: number;
	}

	let { property, level = 0 }: Props = $props();

	let expanded = $state(true);

	function toggleExpand() {
		expanded = !expanded;
	}

	function getTypeDisplay(prop: PropertyInfo): string {
		if (prop.isArray && prop.ref) {
			return `${formatDefinitionName(prop.ref)}[]`;
		} else if (prop.isArray) {
			return '[]';
		} else if (prop.ref) {
			return formatDefinitionName(prop.ref);
		}
		return prop.type;
	}

	function hasNestedContent(prop: PropertyInfo): boolean {
		return !!(prop.properties && prop.properties.length > 0);
	}

	function convertLinks(text: string): string {
		const urlRegex = /(https?:\/\/[^\s]+)/g;

		return text.replace(urlRegex, (url) => {
			let parsedUrl;
			try {
				parsedUrl = new URL(url);
			} catch (error) {
				return url;
			}
			var linkText = url

			const pathBase = parsedUrl.pathname.replace(/\/$/, '').split('/').pop();

			if (pathBase) {
				linkText = pathBase.replace(/\.[^/.]+$/, '');

				if (parsedUrl.hash) {
					linkText += ' ( ' + parsedUrl.hash.substring(1) + ' )';
				}

				linkText = linkText.replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
			}

			return `<a href="${url}" class="link" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
		});
	}
</script>

<div class="property-item mb-2" style="margin-left: {level * 0.5}rem">
	<div class="flex items-start gap-2">
		{#if hasNestedContent(property)}
			<button
				class="btn btn-circle shrink-0 btn-ghost btn-xs"
				onclick={toggleExpand}
				aria-label={expanded ? 'Collapse' : 'Expand'}
			>
				<span class="transition-transform duration-300" class:-rotate-90={!expanded}>▼</span>
			</button>
		{:else}
			<div class="w-8 shrink-0"></div>
		{/if}

		<div class="min-w-0 flex-1">
			<div class="mb-1 flex flex-wrap items-center gap-3">
				<span class="font-mono text-base font-semibold tracking-wide">
					{property.name} <small class="font-normal text-base-content/80">{property.properties?.length && '(' + getPropertiesCount(property) + ')'}</small>
				</span>
				{#if property.required}
					<span class="badge badge-xs badge-soft font-bold badge-error">required</span>
				{/if}

				<span
					class="grow justify-self-end text-right font-mono text-xs wrap-anywhere text-base-content/60 italic"
				>
					{getTypeDisplay(property)}
				</span>
			</div>

			{#if property.description}
				<div
					class="mt-1 text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap text-base-content/70"
				>
					{@html convertLinks(property.description)}
				</div>
			{/if}
		</div>
	</div>

	{#if expanded && hasNestedContent(property)}
		<div class="mt-2 border-l-2 border-base-content/10 pt-2 pl-2">
			{#each property.properties as nestedProp}
				<PropertyTree property={nestedProp} level={level + 1} />
			{/each}
		</div>
	{/if}
</div>
