import semver from 'semver';

// Lazy load API imports - doesn't bundle all JSONs at once
const apiImports = import.meta.glob('./apis/k8s/*/swagger.json');

// Extract available versions from the import paths
const availableApiVersions = Object.keys(apiImports)
	.map((path) => {
		const match = path.match(/\/(\d+\.\d+)\//);
		return match ? match[1] : null;
	})
	.filter((v): v is string => v !== null)
	.sort((a, b) => {
		const aV = semver.coerce(a);
		const bV = semver.coerce(b);
		if (!aV || !bV) return 0;
		return semver.gt(aV, bV) ? -1 : 1;
	});

interface SwaggerDefinitions {
	definitions: Record<string, any>;
}

class K8sApi {
	#selectedVersion = $state(availableApiVersions[0]);
	#loadedApi = $state<SwaggerDefinitions | null>(null);
	#loading = $state(false);
	#error = $state<string | null>(null);

	constructor() {
    const savedVersion = localStorage.getItem('k8sApiVersion');

    if (savedVersion && availableApiVersions.includes(savedVersion)) {
      this.#selectedVersion = savedVersion;
    }

		this.loadVersion(this.#selectedVersion);
	}

	get selectedVersion() {
		return this.#selectedVersion;
	}

	async setSelectedVersion(version: string) {
		if (availableApiVersions.includes(version)) {
			this.#selectedVersion = version;
			await this.loadVersion(version);

      localStorage.setItem('k8sApiVersion', version);
		}
	}

	get availableVersions() {
		return availableApiVersions;
	}

	get isLoading() {
		return this.#loading;
	}

	get error() {
		return this.#error;
	}

	get isLoaded() {
		return this.#loadedApi !== null;
	}

	private async loadVersion(version: string) {
		this.#loading = true;
		this.#error = null;

		try {
			const importPath = `./apis/k8s/${version}/swagger.json`;
			const loader = apiImports[importPath];

			if (!loader) {
				throw new Error(`Version ${version} not found`);
			}

			const module = (await loader()) as SwaggerDefinitions;
			this.#loadedApi = module;
		} catch (err) {
			this.#error = err instanceof Error ? err.message : 'Failed to load API schema';
			console.error(`Failed to load API schema for version ${version}:`, err);
		} finally {
			this.#loading = false;
		}
	}

	getDefinitions(): Record<string, any> {
		return this.#loadedApi?.definitions || {};
	}
}

export const k8sApi = new K8sApi();