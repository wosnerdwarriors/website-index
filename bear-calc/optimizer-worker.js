import { optimizeExhaustively } from "./optimizer-core.mjs";

self.addEventListener("message", (event) => {
  if (event.data?.type !== "run") return;
  try {
    const result = optimizeExhaustively(event.data.payload, (progress) => {
      self.postMessage({ type: "progress", ...progress });
    });
    self.postMessage({ type: "result", ...result });
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
});
