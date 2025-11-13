import semver from 'semver';
const apiImports = import.meta.glob('./*/swagger.json', {
	base: '/src/lib/apis/k8s/',
  eager: true,
})

console.log('Loaded modules:', apiImports);

const availableApiVersions = Object.keys(apiImports).map((path) => {
	return path.split('/')[1];
}).sort((a, b) => {
  const aV = semver.coerce(a);
  const bV = semver.coerce(b);
  if (!aV || !bV) return 0;
  return semver.gt(aV, bV) ? -1 : 1;
})

class K8sApi {
  #selectedVersion = $state(availableApiVersions[0])
  
  get selectedVersion() {
    return this.#selectedVersion;
  }

  set selectedVersion(version: string) {
    if (availableApiVersions.includes(version)) {
      this.#selectedVersion = version;
    }
  }

  get availableVersions() {
    return availableApiVersions;
  }

  getDefinitions() {
    return apiImports[`./${this.#selectedVersion}/swagger.json`].definitions;
  } 
}

export const k8sApi = new K8sApi();