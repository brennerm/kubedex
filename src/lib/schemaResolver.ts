/**
 * Schema resolver for Kubernetes swagger definitions
 * Handles recursive $ref resolution and circular reference detection
 */

export interface PropertyInfo {
	name: string;
	type: string;
	description?: string;
	required: boolean;
	isArray: boolean;
	items?: PropertyInfo[];
	properties?: PropertyInfo[];
	ref?: string;
}

export interface ResolvedSchema {
	name: string;
	description?: string;
	type: string;
	properties: PropertyInfo[];
	required: string[];
}

/**
 * Extracts the definition name from a $ref string
 * Example: "#/definitions/io.k8s.api.core.v1.Pod" -> "io.k8s.api.core.v1.Pod"
 */
function extractRefName(ref: string): string {
	return ref.replace('#/definitions/', '');
}

/**
 * Resolves a property definition, handling $ref, arrays, and nested objects
 */
function resolveProperty(
	propertyName: string,
	propertyDef: any,
	definitions: any,
	required: string[],
	visited: Set<string>,
	depth: number = 0,
	maxDepth: number = 10
): PropertyInfo {
	const isRequired = required.includes(propertyName);

	// Handle direct $ref
	if (propertyDef.$ref) {
		const refName = extractRefName(propertyDef.$ref);
		const info: PropertyInfo = {
			name: propertyName,
			type: 'object',
			description: propertyDef.description,
			required: isRequired,
			isArray: false,
			ref: refName
		};

		// Resolve nested properties if not visited and within depth limit
		if (!visited.has(refName) && depth < maxDepth) {
			visited.add(refName);
			const refDef = definitions[refName];
			if (refDef && refDef.properties) {
				info.properties = resolveProperties(refDef, definitions, visited, depth + 1, maxDepth);
			}
			visited.delete(refName);
		}

		return info;
	}

	// Handle arrays
	if (propertyDef.type === 'array' && propertyDef.items) {
		const info: PropertyInfo = {
			name: propertyName,
			type: 'array',
			description: propertyDef.description,
			required: isRequired,
			isArray: true
		};

		// Handle array items with $ref
		if (propertyDef.items.$ref) {
			const refName = extractRefName(propertyDef.items.$ref);
			info.ref = refName;

			if (!visited.has(refName) && depth < maxDepth) {
				visited.add(refName);
				const refDef = definitions[refName];
				if (refDef && refDef.properties) {
					info.properties = resolveProperties(refDef, definitions, visited, depth + 1, maxDepth);
				}
				visited.delete(refName);
			}
		} else if (propertyDef.items.type) {
			info.items = [
				{
					name: 'item',
					type: propertyDef.items.type,
					description: propertyDef.items.description,
					required: false,
					isArray: false
				}
			];
		}

		return info;
	}

	// Handle objects with nested properties
	if (propertyDef.type === 'object' && propertyDef.properties) {
		return {
			name: propertyName,
			type: 'object',
			description: propertyDef.description,
			required: isRequired,
			isArray: false,
			properties: resolveProperties(propertyDef, definitions, visited, depth + 1, maxDepth)
		};
	}

	// Handle additionalProperties (maps)
	if (propertyDef.additionalProperties) {
		const info: PropertyInfo = {
			name: propertyName,
			type: 'object (map)',
			description: propertyDef.description,
			required: isRequired,
			isArray: false
		};

		if (propertyDef.additionalProperties.$ref) {
			const refName = extractRefName(propertyDef.additionalProperties.$ref);
			info.ref = refName;
		}

		return info;
	}

	// Handle primitive types
	return {
		name: propertyName,
		type: propertyDef.type || 'any',
		description: propertyDef.description,
		required: isRequired,
		isArray: false
	};
}

/**
 * Resolves all properties in a definition
 */
function resolveProperties(
	definition: any,
	definitions: any,
	visited: Set<string>,
	depth: number = 0,
	maxDepth: number = 10
): PropertyInfo[] {
	if (!definition.properties) {
		return [];
	}

	const required = definition.required || [];
	const properties: PropertyInfo[] = [];

	for (const [propName, propDef] of Object.entries(definition.properties)) {
		properties.push(resolveProperty(propName, propDef, definitions, required, visited, depth, maxDepth));
	}

	return properties;
}

/**
 * Resolves a complete schema for a given definition name
 */
export function resolveSchema(definitionName: string, definitions: any): ResolvedSchema {
	const definition = definitions[definitionName];

	if (!definition) {
		throw new Error(`Definition "${definitionName}" not found`);
	}

	const visited = new Set<string>();
	visited.add(definitionName);

	return {
		name: definitionName,
		description: definition.description,
		type: definition.type || 'object',
		properties: resolveProperties(definition, definitions, visited),
		required: definition.required || []
	};
}

/**
 * Formats a definition name by removing io.k8s.api prefix and replacing dots with slashes
 */
export function formatDefinitionName(name: string): string {
  const prefixes = ['io.k8s.api.', 'io.k8s.', 'apimachinery.pkg.apis.', 'kubernetes.pkg.'];
	let formatted = name;
	// Remove io.k8s.api prefix
  for (const prefix of prefixes) {
      if (formatted.startsWith(prefix)) {
        formatted = formatted.replace(prefix, '');
        break;
      }
    }
	// Replace dots with slashes
	formatted = formatted.replace(/\./g, '/');
	return formatted;
}

/**
 * Gets a sorted list of all definition names with formatted display
 */
export function getDefinitionNames(definitions: any): string[] {
	return Object.keys(definitions)
		.map(name => formatDefinitionName(name))
		.sort();
}

/**
 * Gets only top-level resource definitions (not referenced by others)
 * These are typically the main Kubernetes resources like Pod, Deployment, etc.
 * Excludes List objects.
 */
export function getTopLevelDefinitionNames(definitions: any): string[] {
	const allDefinitions = Object.keys(definitions);
	const referencedDefinitions = new Set<string>();

	// Scan all definitions to find which ones are referenced
	// Exclude List objects from being considered as "referrers"
	for (const defName of allDefinitions) {
		// Skip List objects when scanning for references
		if (defName.endsWith('List')) continue;
		
		const definition = definitions[defName];
		if (definition.properties) {
			scanForReferences(definition.properties, referencedDefinitions);
		}
	}

	// Filter to only include definitions that are NOT referenced by others
	// and exclude List objects
	return allDefinitions
		.filter(name => {
			// Exclude List objects (e.g., PodList, DeploymentList, etc.)
			if (name.endsWith('List')) return false;
			
			// Exclude if referenced by others
			if (referencedDefinitions.has(name)) return false;
			
			return true;
		})
		.map(name => formatDefinitionName(name))
		.sort();
}

/**
 * Recursively scans properties to find all $ref references
 */
function scanForReferences(properties: any, referencedSet: Set<string>): void {
	for (const [_, propDef] of Object.entries(properties)) {
		const prop: any = propDef;
		
		// Direct $ref
		if (prop.$ref) {
			referencedSet.add(extractRefName(prop.$ref));
		}
		
		// Array items with $ref
		if (prop.type === 'array' && prop.items?.$ref) {
			referencedSet.add(extractRefName(prop.items.$ref));
		}
		
		// additionalProperties with $ref
		if (prop.additionalProperties?.$ref) {
			referencedSet.add(extractRefName(prop.additionalProperties.$ref));
		}
		
		// Nested properties
		if (prop.properties) {
			scanForReferences(prop.properties, referencedSet);
		}
	}
}

/**
 * Gets the original definition name from a formatted name
 */
export function getOriginalDefinitionName(formattedName: string, definitions: any): string | null {
	// Convert back: replace slashes with dots and try different prefixes
	const withDots = formattedName.replace(/\//g, '.');
	
	// Try different variations
	const variations = [
		`io.k8s.api.${withDots}`,
		`io.k8s.${withDots}`,
		withDots
	];
	
	for (const variation of variations) {
		if (definitions[variation]) {
			return variation;
		}
	}
	
	return null;
}
