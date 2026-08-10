/**
 * Loads the ArcGIS Maps SDK for JavaScript from Esri's CDN.
 *
 * The SDK ships as an AMD bundle: `init.js` installs a global `require`, and
 * every Esri class is pulled through it by module path. That is why this is a
 * script tag and not an npm import — the `@arcgis/core` package is ~600 MB
 * installed and needs its assets copied into `public/`, which buys nothing for
 * a map that only needs `Map` and `MapView`.
 *
 * The loader is memoised at module scope, so React StrictMode's double effect,
 * a remount, or a second map on the page all share one download. Nothing is
 * torn down on unmount: removing the script tag would not unload the AMD
 * registry, and the browser caches the bundle either way.
 */

export const ARCGIS_VERSION = "4.28";

const JS_URL = `https://js.arcgis.com/${ARCGIS_VERSION}/init.js`;

/**
 * The light theme. Only the attribution and the view surface come from Esri —
 * every control in the explorer is our own React chrome — but the stylesheet
 * still has to load or the view lays out wrong.
 */
const CSS_URL = `https://js.arcgis.com/${ARCGIS_VERSION}/esri/themes/light/main.css`;

type AmdRequire = (
  modules: readonly string[],
  callback: (...loaded: unknown[]) => void,
  errback?: (error: unknown) => void,
) => void;

declare global {
  interface Window {
    require?: AmdRequire;
  }
}

let sdk: Promise<AmdRequire> | null = null;

function injectStylesheet(): void {
  if (document.querySelector(`link[href="${CSS_URL}"]`)) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = CSS_URL;
  document.head.appendChild(link);
}

function loadSdk(): Promise<AmdRequire> {
  if (window.require) return Promise.resolve(window.require);

  sdk ??= new Promise<AmdRequire>((resolve, reject) => {
    injectStylesheet();

    const script = document.createElement("script");
    script.src = JS_URL;
    script.async = true;
    script.onload = () => {
      if (window.require) resolve(window.require);
      else reject(new Error("ArcGIS loaded but installed no AMD require()."));
    };
    script.onerror = () => {
      // Let a later mount retry — a failed CDN fetch is usually transient.
      sdk = null;
      script.remove();
      reject(new Error(`Could not load the ArcGIS SDK from ${JS_URL}.`));
    };

    document.head.appendChild(script);
  });

  return sdk;
}

/**
 * Resolves the given Esri module paths, in order, as a tuple.
 *
 *     const [EsriMap, MapView] = await loadArcgisModules<[MapCtor, ViewCtor]>([
 *       "esri/Map",
 *       "esri/views/MapView",
 *     ]);
 */
export async function loadArcgisModules<T extends readonly unknown[]>(
  paths: readonly string[],
): Promise<T> {
  const amdRequire = await loadSdk();

  return new Promise<T>((resolve, reject) => {
    amdRequire(paths, (...loaded) => resolve(loaded as unknown as T), reject);
  });
}
