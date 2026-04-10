import * as ort from "onnxruntime-web";

// Point WASM files to CDN (set once, before any session creation)
ort.env.wasm.wasmPaths =
  "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/";
ort.env.wasm.numThreads = 1;

const sessionCache = new Map<string, ort.InferenceSession>();

// Serialize all session creation through a single queue to prevent
// the "Session already started" race condition in onnxruntime-web.
let queue: Promise<void> = Promise.resolve();

export async function loadSession(
  modelPath: string
): Promise<ort.InferenceSession> {
  const cached = sessionCache.get(modelPath);
  if (cached) return cached;

  // Chain onto the queue so only one session initializes at a time
  const result = new Promise<ort.InferenceSession>((resolve, reject) => {
    queue = queue.then(async () => {
      // Double-check cache (another caller may have loaded it while we waited)
      const cached2 = sessionCache.get(modelPath);
      if (cached2) {
        resolve(cached2);
        return;
      }
      try {
        const session = await ort.InferenceSession.create(modelPath, {
          executionProviders: ["wasm"],
        });
        sessionCache.set(modelPath, session);
        resolve(session);
      } catch (err) {
        reject(err);
      }
    });
  });

  return result;
}

export { ort };
