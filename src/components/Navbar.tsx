"use client";

import { useI18n } from "@/lib/i18n";

const NAV_LINKS = [
  { id: "ppe", en: "PPE Detection", uz: "PPE Aniqlash" },
  { id: "ai4i", en: "Predictive Maintenance", uz: "Proaktiv Texnik Xizmat" },
  { id: "ner", en: "NER Extraction", uz: "NER Ajratish" },
  { id: "secom", en: "SECOM Faults", uz: "SECOM Nosozliklar" },
];

export default function Navbar() {
  const { lang, setLang, t } = useI18n();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(7, 9, 15, 0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
        padding: "0 1.25rem",
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
      }}
    >
      {/* Brand */}
      <div
        style={{
          fontWeight: 800,
          fontSize: "1rem",
          letterSpacing: "-0.02em",
          whiteSpace: "nowrap",
        }}
      >
        <span className="grad-text">
          {t("Smart Factory AI", "Aqlli Zavod AI")}
        </span>
      </div>

      {/* Links */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          overflow: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {NAV_LINKS.map((link) => (
          <button
            key={link.id}
            onClick={() => scrollTo(link.id)}
            className="btn-secondary"
            style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}
          >
            {t(link.en, link.uz)}
          </button>
        ))}
      </div>

      {/* Lang switch */}
      <div className="lang-switch" style={{ flexShrink: 0 }}>
        <button
          className={lang === "en" ? "active" : ""}
          onClick={() => setLang("en")}
        >
          EN
        </button>
        <button
          className={lang === "uz" ? "active" : ""}
          onClick={() => setLang("uz")}
        >
          UZ
        </button>
      </div>
    </nav>
  );
}
