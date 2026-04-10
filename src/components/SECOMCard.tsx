"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { loadSession, ort } from "@/lib/onnx";
import {
  preprocessSecom,
  getSecomThreshold,
  getSecomNFeatures,
} from "@/lib/secom-preprocess";
import VerdictBanner from "@/components/ui/VerdictBanner";
import ProbBar from "@/components/ui/ProbBar";

const SECOM_MODELS = [
  { name: "XGBoost", uzName: "XGBoost", path: "/models/secom_xgb.onnx" },
  { name: "LightGBM", uzName: "LightGBM", path: "/models/secom_lgb.onnx" },
  {
    name: "Random Forest",
    uzName: "Tasodifiy O'rmon",
    path: "/models/secom_rf.onnx",
  },
  {
    name: "Extra Trees",
    uzName: "Qo'shimcha Daraxtlar",
    path: "/models/secom_et.onnx",
  },
];

const NUM_SENSORS = 590;

function generateNormal(): number[] {
  // Simulate a normal SECOM reading: small positive values + NaN placeholders
  const arr: number[] = [];
  for (let i = 0; i < NUM_SENSORS; i++) {
    if (Math.random() < 0.08) {
      arr.push(NaN);
    } else {
      // Normal readings cluster near 0–10 with low variance
      arr.push(Math.abs(Math.random() * 6 + Math.random() * 2));
    }
  }
  return arr;
}

function generateAnomaly(): number[] {
  const arr = generateNormal();
  // Inject anomalies at several key sensors
  const anomalyIdxs = [2, 17, 23, 31, 36, 38, 39, 60, 64, 76, 82, 108, 113, 114, 117, 118, 120, 154, 178, 202, 216, 217, 218, 219, 229, 244, 246, 247, 248, 249, 251, 260, 303, 309, 324, 338, 362, 395, 396, 399, 400, 401, 402, 403, 404, 406, 409, 430, 443, 444, 445, 446, 447, 448, 449, 460, 485, 487, 496, 498];
  for (const idx of anomalyIdxs) {
    if (idx < NUM_SENSORS) {
      arr[idx] = Math.random() * 200 + 150;
    }
  }
  return arr;
}

function formatSensors(values: number[]): string {
  return values
    .map((v) => (isNaN(v) ? "NaN" : v.toFixed(4)))
    .join(", ");
}

/**
 * Extract P(Failure) from ONNX output, handling ZipMap and flat array outputs.
 */
function extractProb1(output: ort.OnnxValue): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: unknown = output.data;

  if (data instanceof Float32Array) {
    if (data.length >= 2) return data[1];
    if (data.length === 1) return data[0];
  }

  if (Array.isArray(data)) {
    const first = (data as Record<string | number, number>[])[0];
    if (first !== null && typeof first === "object" && !Array.isArray(first)) {
      const v = first[1] ?? first["1"];
      if (typeof v === "number") return v;
    }
    if (data.length >= 2 && typeof data[1] === "number") return data[1] as number;
    if (data.length === 1 && typeof data[0] === "number") return data[0] as number;
  }

  return 0;
}

export default function SECOMCard() {
  const { t } = useI18n();
  const [sensorText, setSensorText] = useState(() =>
    formatSensors(generateNormal())
  );
  const [probs, setProbs] = useState<number[] | null>(null);
  const [ensProb, setEnsProb] = useState<number | null>(null);
  const [threshold, setThreshold] = useState(0.666);
  const [nFeatures, setNFeatures] = useState(60);
  const [status, setStatus] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const loadNormal = () => {
    setSensorText(formatSensors(generateNormal()));
    setProbs(null);
    setEnsProb(null);
    setStatus("idle");
  };

  const loadAnomaly = () => {
    setSensorText(formatSensors(generateAnomaly()));
    setProbs(null);
    setEnsProb(null);
    setStatus("idle");
  };

  const runEnsemble = async () => {
    try {
      setStatus("loading");
      setErrorMsg("");

      const rawValues = sensorText
        .split(",")
        .map((s) => {
          const trimmed = s.trim();
          if (trimmed.toLowerCase() === "nan" || trimmed === "") return NaN;
          return parseFloat(trimmed);
        });

      const [features, thresh, nFeat] = await Promise.all([
        preprocessSecom(rawValues),
        getSecomThreshold(),
        getSecomNFeatures(),
      ]);

      setThreshold(thresh);
      setNFeatures(nFeat);

      const inputTensor = new ort.Tensor("float32", features, [
        1,
        features.length,
      ]);

      // Load and run all 4 models sequentially (WASM single-thread)
      const modelProbs: number[] = [];
      for (const m of SECOM_MODELS) {
        const sess = await loadSession(m.path);
        const res = await sess.run({ features: inputTensor });
        const keys = Object.keys(res);
        const probKey =
          keys.find((k) => k.toLowerCase().includes("prob")) ??
          keys[1] ??
          keys[0];
        modelProbs.push(extractProb1(res[probKey]));
      }

      const ens: number =
        modelProbs.reduce((a: number, b: number) => a + b, 0) / modelProbs.length;

      setProbs(modelProbs);
      setEnsProb(ens);
      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrorMsg(String(err));
      setStatus("error");
    }
  };

  const isFault = ensProb !== null && ensProb >= threshold;

  // Count valid sensors
  const rawCount = sensorText.split(",").length;
  const validCount = sensorText
    .split(",")
    .filter((s) => {
      const v = parseFloat(s.trim());
      return !isNaN(v);
    }).length;

  return (
    <div className="card">
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div className="section-badge" style={{ color: "var(--accent-4)" }}>
          04 &bull; {t("SECOM Fault Detection", "SECOM Nosozlik Aniqlash")}
        </div>
        <h2
          style={{ fontSize: "1.35rem", fontWeight: 700, marginBottom: "0.3rem" }}
        >
          {t(
            "Semiconductor Yield Fault Detection",
            "Yarim O'tkazgich Hosil Nosozligini Aniqlash"
          )}
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          {t(
            "4-model ensemble (XGB + LGB + RF + ET) on 590 process control sensors.",
            "590 ta jarayon boshqaruv sensorida 4 ta model ansambli (XGB + LGB + RF + ET)."
          )}
        </p>
      </div>

      {/* Generate buttons */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <button className="btn-secondary" onClick={loadNormal}>
          {t("Generate Normal", "Normal Yaratish")}
        </button>
        <button className="btn-secondary" onClick={loadAnomaly}>
          {t("Generate Anomaly", "Anomaliya Yaratish")}
        </button>
      </div>

      {/* Sensor textarea */}
      <textarea
        value={sensorText}
        onChange={(e) => {
          setSensorText(e.target.value);
          setProbs(null);
          setEnsProb(null);
          setStatus("idle");
        }}
        rows={6}
        style={{ marginBottom: "0.5rem", fontFamily: "monospace", fontSize: "0.72rem", resize: "vertical" }}
        placeholder={t(
          "Paste 590 comma-separated sensor values (NaN allowed)…",
          "590 ta vergul bilan ajratilgan sensor qiymatlarini joylashtiring (NaN mumkin)…"
        )}
      />

      {/* Sensor stats */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          fontSize: "0.78rem",
          color: "var(--text-secondary)",
          marginBottom: "1rem",
        }}
      >
        <span>
          {t("Total:", "Jami:")} <strong style={{ color: "var(--text-primary)" }}>{rawCount}</strong>
        </span>
        <span>
          {t("Valid:", "To'g'ri:")} <strong style={{ color: "var(--accent-4)" }}>{validCount}</strong>
        </span>
        <span>
          {t("NaN:", "NaN:")} <strong style={{ color: "var(--accent-5)" }}>{rawCount - validCount}</strong>
        </span>
        <span>
          {t("Selected features:", "Tanlangan xususiyatlar:")} <strong style={{ color: "var(--accent-2)" }}>{nFeatures}</strong>
        </span>
      </div>

      {/* Run button */}
      <button
        className="btn-primary"
        onClick={runEnsemble}
        disabled={!sensorText.trim() || status === "loading"}
        style={{ width: "100%", marginBottom: "1rem" }}
      >
        {status === "loading"
          ? t("Running ensemble…", "Ansambl ishlatilmoqda…")
          : t("Run Ensemble", "Ansamblni Ishlatish")}
      </button>

      {/* Results */}
      {status === "done" && ensProb !== null && probs !== null && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <VerdictBanner
            verdict={isFault ? "danger" : "safe"}
            label={
              isFault
                ? t("FAULT DETECTED", "NOSOZLIK ANIQLANDI")
                : t("PROCESS NORMAL", "JARAYON NORMAL")
            }
            sublabel={t(
              `Ensemble P(fault): ${(ensProb * 100).toFixed(2)}% (threshold: ${(threshold * 100).toFixed(2)}%)`,
              `Ansambl P(nosozlik): ${(ensProb * 100).toFixed(2)}% (chegara: ${(threshold * 100).toFixed(2)}%)`
            )}
          />

          {SECOM_MODELS.map((m, i) => (
            <ProbBar
              key={m.path}
              label={t(`${m.name} — P(Fault)`, `${m.uzName} — P(Nosozlik)`)}
              probability={probs[i]}
            />
          ))}

          <ProbBar
            label={t("Ensemble Average — P(Fault)", "Ansambl O'rtacha — P(Nosozlik)")}
            probability={ensProb}
            accent={isFault ? "var(--accent-6)" : "var(--accent-4)"}
          />

          <div className="metric-row">
            <span>{t("Decision threshold", "Qaror chegarasi")}</span>
            <span className="metric-value">{(threshold * 100).toFixed(4)}%</span>
          </div>
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
