"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { extractEntities, type NERResult } from "@/lib/ner-lexicons";
import EntityTag from "@/components/ui/EntityTag";

const EXAMPLES = [
  {
    short: "Hydraulic pump incident",
    uzShort: "Gidravlik nasos hodisasi",
    text: "The hydraulic pump's drive belt broke at 08:15. A 40 mm bolt fell from the crane arm and hit the compressor housing at 6 bar. Operator at Fanuc robot line reported a loose gasket in the chiller.",
  },
  {
    short: "Bearing failure",
    uzShort: "Podshipnik nosozligi",
    text: "At the Samsung Pyeongtaek fab, a 120 kg overheated bearing in the conveyor motor caused a 45 minute production stop. The gearbox output shaft was bent 3 mm and the drive belt snapped.",
  },
  {
    short: "POSCO press line rupture",
    uzShort: "POSCO press liniyasi portlashi",
    text: "Workers at POSCO Pohang Mill reported a ruptured hydraulic hose at the press line, leaking 18 liters of oil. A corroded flange on the cooling pipe was replaced; the forklift struck a loose bracket on the chain conveyor.",
  },
];

export default function NERCard() {
  const { t } = useI18n();
  const [text, setText] = useState(EXAMPLES[0].text);
  const [result, setResult] = useState<NERResult | null>(null);

  const runExtract = () => {
    const r = extractEntities(text);
    setResult(r);
  };

  return (
    <div className="card">
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div className="section-badge" style={{ color: "var(--accent-3)" }}>
          03 &bull; {t("NER Extraction", "NER Ajratish")}
        </div>
        <h2 style={{ fontSize: "1.35rem", fontWeight: 700, marginBottom: "0.3rem" }}>
          {t(
            "Industrial NER — Equipment, Parts & Actions",
            "Sanoat NER — Uskunalar, Qismlar va Harakatlar"
          )}
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          {t(
            "Lexicon-based named-entity recognition for maintenance logs and incident reports.",
            "Texnik xizmat jurnallari va hodisa hisobotlari uchun leksikonga asoslangan nomli-obyekt tanib olish."
          )}
        </p>
      </div>

      {/* Preset buttons */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        {EXAMPLES.map((ex, i) => (
          <button
            key={i}
            className="btn-secondary"
            onClick={() => {
              setText(ex.text);
              setResult(null);
            }}
          >
            {t(ex.short, ex.uzShort)}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setResult(null);
        }}
        rows={5}
        style={{ marginBottom: "1rem", resize: "vertical" }}
        placeholder={t(
          "Paste a maintenance report or incident description…",
          "Texnik xizmat hisobotini yoki hodisa tavsifini joylashtiring…"
        )}
      />

      {/* Extract button */}
      <button
        className="btn-primary"
        onClick={runExtract}
        disabled={!text.trim()}
        style={{ width: "100%", marginBottom: "1rem" }}
      >
        {t("Extract Entities", "Obyektlarni Ajratish")}
      </button>

      {/* Results */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <EntityGroup
            label={t("Equipment", "Uskunalar")}
            uzLabel={t("Equipment", "Uskunalar")}
            items={result.equipment}
            type="equipment"
            emptyMsg={t("None found", "Topilmadi")}
          />
          <EntityGroup
            label={t("Parts", "Qismlar")}
            uzLabel={t("Parts", "Qismlar")}
            items={result.parts}
            type="parts"
            emptyMsg={t("None found", "Topilmadi")}
          />
          <EntityGroup
            label={t("Actions", "Harakatlar")}
            uzLabel={t("Actions", "Harakatlar")}
            items={result.actions}
            type="actions"
            emptyMsg={t("None found", "Topilmadi")}
          />

          {/* Quantities */}
          <div>
            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--text-secondary)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: "0.5rem",
              }}
            >
              {t("Quantities", "Miqdorlar")}{" "}
              <span style={{ opacity: 0.55 }}>({result.quantities.length})</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {result.quantities.length === 0 ? (
                <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  {t("None found", "Topilmadi")}
                </span>
              ) : (
                result.quantities.map((q, i) => (
                  <EntityTag
                    key={i}
                    text={`${q.value} ${q.unit}`}
                    type="quantities"
                  />
                ))
              )}
            </div>
          </div>

          {/* Summary */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "0.5rem",
              marginTop: "0.25rem",
            }}
          >
            {[
              { label: t("Equipment", "Uskunalar"), count: result.equipment.length, color: "var(--accent-1)" },
              { label: t("Parts", "Qismlar"), count: result.parts.length, color: "var(--accent-2)" },
              { label: t("Actions", "Harakatlar"), count: result.actions.length, color: "var(--accent-5)" },
              { label: t("Quantities", "Miqdorlar"), count: result.quantities.length, color: "var(--accent-4)" },
            ].map(({ label, count, color }) => (
              <div
                key={label}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  padding: "0.75rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color }}>
                  {count}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EntityGroup({
  label,
  items,
  type,
  emptyMsg,
}: {
  label: string;
  uzLabel: string;
  items: string[];
  type: "equipment" | "parts" | "actions" | "quantities";
  emptyMsg: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "0.78rem",
          color: "var(--text-secondary)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: "0.5rem",
        }}
      >
        {label}{" "}
        <span style={{ opacity: 0.55 }}>({items.length})</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
        {items.length === 0 ? (
          <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            {emptyMsg}
          </span>
        ) : (
          items.map((item, i) => (
            <EntityTag key={i} text={item} type={type} />
          ))
        )}
      </div>
    </div>
  );
}
