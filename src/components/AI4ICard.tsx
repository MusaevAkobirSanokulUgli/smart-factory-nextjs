"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { loadSession, ort } from "@/lib/onnx";
import { engineerFeatures, type AI4IInput } from "@/lib/ai4i-features";
import VerdictBanner from "@/components/ui/VerdictBanner";
import ProbBar from "@/components/ui/ProbBar";

const XGB_PATH = "/models/ai4i_xgboost.onnx";
const LGB_PATH = "/models/ai4i_lightgbm.onnx";

const ENSEMBLE_THRESHOLD = 0.9718;

type MachineType = "L" | "M" | "H";

interface FormState {
  airTempK: string;
  processTempK: string;
  rotationalSpeedRpm: string;
  torqueNm: string;
  toolWearMin: string;
  machineType: MachineType;
}

const PRESETS: { label: string; uzLabel: string; values: FormState }[] = [
  {
    label: "Healthy",
    uzLabel: "Sog'lom",
    values: {
      airTempK: "298.1",
      processTempK: "308.6",
      rotationalSpeedRpm: "1551",
      torqueNm: "42.8",
      toolWearMin: "108",
      machineType: "M",
    },
  },
  {
    label: "Overstrain",
    uzLabel: "Haddan tashqari zo'riqish",
    values: {
      airTempK: "299.3",
      processTempK: "309.8",
      rotationalSpeedRpm: "1282",
      torqueNm: "68.4",
      toolWearMin: "215",
      machineType: "L",
    },
  },
  {
    label: "Heat Dissipation",
    uzLabel: "Issiqlik tarqalishi",
    values: {
      airTempK: "302.1",
      processTempK: "308.9",
      rotationalSpeedRpm: "1320",
      torqueNm: "36.1",
      toolWearMin: "140",
      machineType: "M",
    },
  },
];

/**
 * Extract probability for class 1 (Failure) from onnxmltools ZipMap output.
 * The output is typically a sequence of maps: [{0: p0, 1: p1}, ...]
 * We handle several output layouts defensively.
 */
function extractProb1(output: ort.OnnxValue): number {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: unknown = output.data;

  // Float32Array [p0, p1] — flat prob output
  if (data instanceof Float32Array) {
    if (data.length >= 2) return data[1];
    if (data.length === 1) return data[0];
  }

  // ZipMap returns a JS array of plain objects {0: p0, 1: p1}
  if (Array.isArray(data)) {
    const first = (data as Record<string | number, number>[])[0];
    if (first !== null && typeof first === "object" && !Array.isArray(first)) {
      const v = first[1] ?? first["1"];
      if (typeof v === "number") return v;
    }
    // Flat number array
    if (data.length >= 2 && typeof data[1] === "number") return data[1] as number;
    if (data.length === 1 && typeof data[0] === "number") return data[0] as number;
  }

  return 0;
}

export default function AI4ICard() {
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(PRESETS[0].values);
  const [xgbProb, setXgbProb] = useState<number | null>(null);
  const [lgbProb, setLgbProb] = useState<number | null>(null);
  const [ensProb, setEnsProb] = useState<number | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const setField = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const runPredict = async () => {
    try {
      setStatus("loading");
      setErrorMsg("");

      const input: AI4IInput = {
        airTempK: parseFloat(form.airTempK),
        processTempK: parseFloat(form.processTempK),
        rotationalSpeedRpm: parseFloat(form.rotationalSpeedRpm),
        torqueNm: parseFloat(form.torqueNm),
        toolWearMin: parseFloat(form.toolWearMin),
        machineType: form.machineType,
      };

      const features = engineerFeatures(input);
      const inputTensor = new ort.Tensor("float32", features, [1, 15]);

      const [xgbSession, lgbSession] = await Promise.all([
        loadSession(XGB_PATH),
        loadSession(LGB_PATH),
      ]);

      const [xgbResult, lgbResult] = await Promise.all([
        xgbSession.run({ X: inputTensor }),
        lgbSession.run({ X: inputTensor }),
      ]);

      // Try common output key names
      const getProb = (results: Record<string, ort.OnnxValue>): number => {
        // Prefer "probabilities" key, fallback to second key (index 1), then first
        const keys = Object.keys(results);
        const probKey =
          keys.find((k) => k.toLowerCase().includes("prob")) ??
          keys[1] ??
          keys[0];
        return extractProb1(results[probKey]);
      };

      const xgb = getProb(xgbResult);
      const lgb = getProb(lgbResult);
      const ens = (xgb + lgb) / 2;

      setXgbProb(xgb);
      setLgbProb(lgb);
      setEnsProb(ens);
      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrorMsg(String(err));
      setStatus("error");
    }
  };

  const isFailure = ensProb !== null && ensProb >= ENSEMBLE_THRESHOLD;

  return (
    <div className="card">
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div className="section-badge" style={{ color: "var(--accent-2)" }}>
          02 &bull; {t("Predictive Maintenance", "Proaktiv Texnik Xizmat")}
        </div>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 700, marginBottom: "0.3rem" }}>
          {t("AI4I Machine Failure Prediction", "AI4I Mashina Nosozligini Bashorat Qilish")}
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          {t(
            "XGBoost + LightGBM ensemble on engineered features from sensor readings.",
            "Sensor ko'rsatkichlaridan yaratilgan xususiyatlarda XGBoost + LightGBM ansambli."
          )}
        </p>
      </div>

      {/* Presets */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            className="btn-secondary"
            onClick={() => setForm(p.values)}
          >
            {t(p.label, p.uzLabel)}
          </button>
        ))}
      </div>

      {/* Form */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        {(
          [
            ["airTempK", t("Air Temp (K)", "Havo harorati (K)"), "298.1"],
            ["processTempK", t("Process Temp (K)", "Jarayon harorati (K)"), "308.6"],
            ["rotationalSpeedRpm", t("Speed (RPM)", "Tezlik (RPM)"), "1551"],
            ["torqueNm", t("Torque (Nm)", "Burama momenti (Nm)"), "42.8"],
            ["toolWearMin", t("Tool Wear (min)", "Asbob yeyilishi (min)"), "108"],
          ] as [keyof FormState, string, string][]
        ).map(([key, label, placeholder]) => (
          <div key={key} style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <label style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              {label}
            </label>
            <input
              type="number"
              value={form[key] as string}
              placeholder={placeholder}
              onChange={(e) => setField(key, e.target.value)}
              step="0.1"
            />
          </div>
        ))}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <label style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            {t("Machine Type", "Mashina turi")}
          </label>
          <select
            value={form.machineType}
            onChange={(e) =>
              setField("machineType", e.target.value as MachineType)
            }
          >
            <option value="L">L — {t("Low", "Past")}</option>
            <option value="M">M — {t("Medium", "O'rta")}</option>
            <option value="H">H — {t("High", "Yuqori")}</option>
          </select>
        </div>
      </div>

      {/* Predict button */}
      <button
        className="btn-primary"
        onClick={runPredict}
        disabled={status === "loading"}
        style={{ width: "100%", marginBottom: "1rem" }}
      >
        {status === "loading"
          ? t("Predicting…", "Bashorat qilinmoqda…")
          : t("Predict Failure", "Nosozlikni bashorat qilish")}
      </button>

      {/* Results */}
      {status === "done" && ensProb !== null && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <VerdictBanner
            verdict={isFailure ? "danger" : "safe"}
            label={
              isFailure
                ? t("FAILURE PREDICTED", "NOSOZLIK BASHORAT QILINDI")
                : t("MACHINE HEALTHY", "MASHINA SALOMAT")
            }
            sublabel={t(
              `Ensemble probability: ${(ensProb * 100).toFixed(2)}% (threshold: ${(ENSEMBLE_THRESHOLD * 100).toFixed(1)}%)`,
              `Ansambl ehtimoli: ${(ensProb * 100).toFixed(2)}% (chegara: ${(ENSEMBLE_THRESHOLD * 100).toFixed(1)}%)`
            )}
          />

          <ProbBar
            label={t("XGBoost — P(Failure)", "XGBoost — P(Nosozlik)")}
            probability={xgbProb ?? 0}
          />
          <ProbBar
            label={t("LightGBM — P(Failure)", "LightGBM — P(Nosozlik)")}
            probability={lgbProb ?? 0}
          />
          <ProbBar
            label={t("Ensemble mean — P(Failure)", "Ansambl o'rtacha — P(Nosozlik)")}
            probability={ensProb}
            accent={isFailure ? "var(--accent-6)" : "var(--accent-4)"}
          />

          <div className="metric-row">
            <span>{t("Decision threshold", "Qaror chegarasi")}</span>
            <span className="metric-value">
              {(ENSEMBLE_THRESHOLD * 100).toFixed(2)}%
            </span>
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
