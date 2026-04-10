import * as ort from "onnxruntime-web";

// Point WASM files to the CDN so they aren't bundled
ort.env.wasm.wasmPaths =
  "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/";

const sessionCache = new Map<string, Promise<ort.InferenceSession>>();

export async function loadSession(
  modelPath: string
): Promise<ort.InferenceSession> {
  const cached = sessionCache.get(modelPath);
  if (cached) return cached;

  const promise = ort.InferenceSession.create(modelPath, {
    executionProviders: ["wasm"],
  });

  sessionCache.set(modelPath, promise);

  try {
    return await promise;
  } catch (err) {
    sessionCache.delete(modelPath);
    throw err;
  }
}

export { ort };
