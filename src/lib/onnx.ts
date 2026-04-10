import * as ort from "onnxruntime-web";

// ──────────────────────────────────────────────────────────────
// WASM backend configuration — set ONCE, before any session.
// proxy=false  → avoids the Web Worker that triggers "already started"
// numThreads=1 → prevents multi-thread init race
// ──────────────────────────────────────────────────────────────
ort.env.wasm.proxy = false;
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths =
  "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/";

// Cache of fully-resolved sessions
const cache = new Map<string, ort.InferenceSession>();

// Global sequential lock — guarantees only ONE InferenceSession.create()
// runs at any given moment, which prevents the WASM runtime from being
// double-initialized.
let initLock: Promise<void> = Promise.resolve();

export async function loadSession(
  modelPath: string
): Promise<ort.InferenceSession> {
  // Fast path: already loaded
  const hit = cache.get(modelPath);
  if (hit) return hit;

  // Acquire the lock by chaining a new step onto the promise queue
  return new Promise<ort.InferenceSession>((resolve, reject) => {
    initLock = initLock
      .then(async () => {
        // Re-check cache (might have been loaded while we waited)
        const hit2 = cache.get(modelPath);
        if (hit2) {
          resolve(hit2);
          return;
        }

        const session = await ort.InferenceSession.create(modelPath, {
          executionProviders: ["wasm"],
        });
        cache.set(modelPath, session);
        resolve(session);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

export { ort };
