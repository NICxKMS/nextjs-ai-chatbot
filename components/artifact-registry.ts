import type { Artifact } from "./create-artifact";

export type ArtifactKind = "text" | "code" | "image" | "sheet";

type ArtifactInstance = Artifact<ArtifactKind, unknown>;

const artifactLoaders: Record<ArtifactKind, () => Promise<ArtifactInstance>> = {
  text: () =>
    import("@/artifacts/text/client").then(
      (module) => module.textArtifact as ArtifactInstance
    ),
  code: () =>
    import("@/artifacts/code/client").then(
      (module) => module.codeArtifact as ArtifactInstance
    ),
  image: () =>
    import("@/artifacts/image/client").then(
      (module) => module.imageArtifact as ArtifactInstance
    ),
  sheet: () =>
    import("@/artifacts/sheet/client").then(
      (module) => module.sheetArtifact as ArtifactInstance
    ),
};

const artifactCache = new Map<ArtifactKind, ArtifactInstance>();
const artifactPromises = new Map<ArtifactKind, Promise<ArtifactInstance>>();

export type ArtifactDefinition = ArtifactInstance;

export function getArtifactDefinition(kind: ArtifactKind) {
  return artifactCache.get(kind);
}

export function loadArtifactDefinition(kind: ArtifactKind) {
  if (artifactCache.has(kind)) {
    return Promise.resolve(artifactCache.get(kind) as ArtifactInstance);
  }

  let pendingPromise = artifactPromises.get(kind);
  if (!pendingPromise) {
    const loader = artifactLoaders[kind];
    if (!loader) {
      return Promise.reject(new Error(`Unknown artifact kind: ${kind}`));
    }
    pendingPromise = loader().then((artifact) => {
      artifactCache.set(kind, artifact);
      artifactPromises.delete(kind);
      return artifact;
    });
    artifactPromises.set(kind, pendingPromise);
  }

  return pendingPromise;
}

export function preloadArtifactDefinition(kind: ArtifactKind) {
  return loadArtifactDefinition(kind);
}

export function preloadAllArtifactDefinitions() {
  return Promise.all(
    (Object.keys(artifactLoaders) as ArtifactKind[]).map((kind) =>
      loadArtifactDefinition(kind)
    )
  ).then(() => undefined);
}
