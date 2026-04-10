"use client";

import { useCallback, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { loadSession, ort } from "@/lib/onnx";
import { letterbox, yoloPostprocess, type Detection } from "@/lib/yolo-postprocess";
import VerdictBanner from "@/components/ui/VerdictBanner";

const MODEL_PATH = "/models/yolov8s_hardhat.onnx";
const MODEL_SIZE = 640;

export default function PPECard() {
  const { t } = useI18n();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[] | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "inferring" | "done" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setDetections(null);
    setLatency(null);
    setStatus("idle");

    // Draw preview
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0);
    };
    img.src = url;
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const runDetect = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl) return;

    try {
      setStatus("loading");
      setErrorMsg("");

      // Ensure image is fully drawn
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
        img.src = imageUrl;
      });

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      setStatus("loading");
      const session = await loadSession(MODEL_PATH);

      setStatus("inferring");
      const { tensor, ratio, padW, padH } = letterbox(imageData, MODEL_SIZE);
      const inputTensor = new ort.Tensor("float32", tensor, [
        1,
        3,
        MODEL_SIZE,
        MODEL_SIZE,
      ]);

      const t0 = performance.now();
      const results = await session.run({ images: inputTensor });
      const elapsed = performance.now() - t0;

      // YOLOv8 output key — typically "output0"
      const outputKey = Object.keys(results)[0];
      const rawOutput = results[outputKey].data as Float32Array;

      const dets = yoloPostprocess(
        rawOutput,
        ratio,
        padW,
        padH,
        img.naturalWidth,
        img.naturalHeight,
        0.05,
        0.45
      );

      setDetections(dets);
      setLatency(elapsed);
      setStatus("done");

      // Draw boxes
      ctx.drawImage(img, 0, 0);
      for (const det of dets) {
        const [x1, y1, x2, y2] = det.box;
        const isSafe = det.className === "Hardhat";
        ctx.strokeStyle = isSafe ? "#34d399" : "#f87171";
        ctx.lineWidth = Math.max(2, canvas.width / 400);
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        const label = `${det.className} ${(det.confidence * 100).toFixed(0)}%`;
        const fontSize = Math.max(12, canvas.width / 60);
        ctx.font = `bold ${fontSize}px system-ui`;
        const textW = ctx.measureText(label).width + 8;
        ctx.fillStyle = isSafe ? "#34d399" : "#f87171";
        ctx.fillRect(x1, y1 - fontSize - 4, textW, fontSize + 6);
        ctx.fillStyle = "#07090f";
        ctx.fillText(label, x1 + 4, y1 - 4);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(String(err));
      setStatus("error");
    }
  }, [imageUrl]);

  const hardhatCount =
    detections?.filter((d) => d.className === "Hardhat").length ?? 0;
  const noHardhatCount =
    detections?.filter((d) => d.className === "NO-Hardhat").length ?? 0;
  const isSafe = status === "done" && noHardhatCount === 0;
  const isDanger = status === "done" && noHardhatCount > 0;

  return (
    <div className="card">
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div
          className="section-badge"
          style={{ color: "var(--accent-1)" }}
        >
          01 &bull; {t("PPE Detection", "PPE Aniqlash")}
        </div>
        <h2
          style={{
            fontSize: "1.35rem",
            fontWeight: 700,
            marginBottom: "0.3rem",
          }}
        >
          {t("Hardhat Detection (YOLOv8s)", "Bosh qo'riqlagich aniqlash (YOLOv8s)")}
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          {t(
            "Upload a factory image. The model detects hardhats and flags workers without PPE.",
            "Zavod tasvirini yuklang. Model bosh qo'riqlagichlarni aniqlaydi va PPE kiymaganlarni belgilaydi."
          )}
        </p>
      </div>

      {/* Drop zone */}
      <div
        className={`dropzone${dragOver ? " drag-over" : ""}`}
        style={{ marginBottom: "1rem", minHeight: 120 }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <span style={{ fontSize: "2rem" }}>📷</span>
        <span>
          {imageFile
            ? imageFile.name
            : t(
                "Drop an image here or click to browse",
                "Rasmni bu yerga tashlang yoki ko'rish uchun bosing"
              )}
        </span>
        <span style={{ fontSize: "0.75rem" }}>
          {t("JPG, PNG, WEBP", "JPG, PNG, WEBP")}
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={onInputChange}
      />

      {/* Canvas preview */}
      {imageUrl && (
        <div style={{ marginBottom: "1rem", textAlign: "center" }}>
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: "100%",
              borderRadius: "0.5rem",
              border: "1px solid var(--border)",
            }}
          />
        </div>
      )}

      {/* Action button */}
      <button
        className="btn-primary"
        onClick={runDetect}
        disabled={!imageUrl || status === "loading" || status === "inferring"}
        style={{ width: "100%", marginBottom: "1rem" }}
      >
        {status === "loading"
          ? t("Loading model (44.7 MB)…", "Model yuklanmoqda (44.7 MB)…")
          : status === "inferring"
          ? t("Running inference…", "Xulosa chiqarilmoqda…")
          : t("Detect PPE", "PPE ni aniqlash")}
      </button>

      {/* Results */}
      {status === "done" && detections !== null && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <VerdictBanner
            verdict={isSafe ? "safe" : "danger"}
            label={
              isSafe
                ? t("SAFE — All workers wearing hardhats", "XAVFSIZ — Barcha ishchilar bosh qo'riqlagich kiygan")
                : t(`UNSAFE — ${noHardhatCount} worker(s) without hardhat`, `XAVFLI — ${noHardhatCount} ta ishchi bosh qo'riqlagichsiz`)
            }
            sublabel={t(`Latency: ${latency?.toFixed(0)} ms`, `Kechikish: ${latency?.toFixed(0)} ms`)}
          />

          <div style={{ display: "flex", gap: "1rem" }}>
            <div className="metric-row" style={{ flex: 1 }}>
              <span>{t("Hardhats detected", "Bosh qo'riqlagichlar")}</span>
              <span className="metric-value" style={{ color: "var(--accent-4)" }}>
                {hardhatCount}
              </span>
            </div>
            <div className="metric-row" style={{ flex: 1 }}>
              <span>{t("Without hardhat", "Bosh qo'riqlagichsiz")}</span>
              <span className="metric-value" style={{ color: "var(--accent-6)" }}>
                {noHardhatCount}
              </span>
            </div>
          </div>

          {detections.length === 0 && (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              {t(
                "No detections above confidence threshold (0.05). Try a clearer image.",
                "Ishonch chegarasidan (0.05) yuqori aniqlov yo'q. Aniqroq rasm sinab ko'ring."
              )}
            </p>
          )}
        </div>
      )}

      {status === "error" && (
        <p style={{ color: "var(--accent-6)", fontSize: "0.85rem" }}>
          {t("Error:", "Xato:")} {errorMsg}
        </p>
      )}
    </div>
  );
}
