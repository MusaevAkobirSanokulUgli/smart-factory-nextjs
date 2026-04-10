import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Silence the Turbopack warning — we don't need custom Turbopack rules
  // since onnxruntime-web WASM is served from CDN (set in src/lib/onnx.ts)
  // and .onnx models are served directly from /public/models/
  turbopack: {},
};

export default nextConfig;
