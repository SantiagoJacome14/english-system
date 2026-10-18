// Shared setup for the voice workers. Model files are requested from huggingface.co by the libraries;
// we send those requests to app://app/models/, which keeps a copy on disk (see main.js), and turn off
// the browser cache so the files aren't stored twice.
export const BASE = new URL("../", import.meta.url).href;
delete WorkerGlobalScope.prototype.caches;
const realFetch = self.fetch.bind(self);
const HF = "https://huggingface.co/";
self.fetch = (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url && url.startsWith(HF)) return realFetch(BASE + "models/" + url.slice(HF.length), init);
  return realFetch(input, init);
};
export const WASM = BASE + "vendor/";
