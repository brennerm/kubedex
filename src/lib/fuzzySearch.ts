import type { PropertyInfo } from './schemaResolver';

/**
 * Simple fuzzy matching function
 * Returns true if all characters in the search term appear in order in the text
 */
export function fuzzyMatch(text: string, search: string | null): boolean {
	if (!search) return true;
	
	const textLower = text.toLowerCase();
	const searchLower = search.toLowerCase();
	
	let searchIndex = 0;
	
	for (let i = 0; i < textLower.length && searchIndex < searchLower.length; i++) {
		if (textLower[i] === searchLower[searchIndex]) {
			searchIndex++;
		}
	}
	
	return searchIndex === searchLower.length;
}

/**
 * Checks if a property or any of its children match the search
 * Used for determining if a property should be auto-expanded
 */
export function propertyMatchesSearch(property: PropertyInfo, search: string | null): boolean {
	if (!search) return true;
	
	// Check if property name matches
	if (fuzzyMatch(property.name, search)) return true;
	
	if (property.description && fuzzyMatch(property.description, search)) return true;
	
	if (fuzzyMatch(property.type, search)) return true;
	
	if (property.required && fuzzyMatch('required', search)) return true;
	
	// Check if any nested properties match
	if (property.properties && property.properties.length > 0) {
		return property.properties.some(child => propertyMatchesSearch(child, search));
	}
	
	return false;
}

/**
 * Recursively filters properties and their children based on fuzzy search
 * Returns a new property with filtered children if any match
 */
export function filterPropertyTree(property: PropertyInfo, search: string): PropertyInfo | null {
	if (!search) return property;
	
	// Check if this property itself matches
	const propertyMatches = 
		fuzzyMatch(property.name, search) ||
		(property.description && fuzzyMatch(property.description, search)) ||
		fuzzyMatch(property.type, search) ||
		(property.ref && fuzzyMatch(property.ref, search));
	
	// Filter nested properties
	let filteredChildren: PropertyInfo[] | undefined = undefined;
	if (property.properties && property.properties.length > 0) {
		const filtered = property.properties
			.map(child => filterPropertyTree(child, search))
			.filter((child): child is PropertyInfo => child !== null);
		
		if (filtered.length > 0) {
			filteredChildren = filtered;
		}
	}
	
	// Return the property if it matches or has matching children
	if (propertyMatches || filteredChildren) {
		return {
			...property,
			properties: filteredChildren || property.properties
		};
	}
	
	return null;
}

/**
 * Filters an array of properties based on fuzzy search
 * Preserves nested structure and parent properties when children match
 */
export function filterProperties(properties: PropertyInfo[], search: string): PropertyInfo[] {
	if (!search) return properties;
	
	return properties
		.map(prop => filterPropertyTree(prop, search))
		.filter((prop): prop is PropertyInfo => prop !== null);
}
