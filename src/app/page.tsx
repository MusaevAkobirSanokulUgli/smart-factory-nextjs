"use client";

import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";

// Lazy-load heavy components to avoid SSR issues with canvas/onnxruntime
const PPECard = dynamic(() => import("@/components/PPECard"), { ssr: false });
const AI4ICard = dynamic(() => import("@/components/AI4ICard"), { ssr: false });
const NERCard = dynamic(() => import("@/components/NERCard"), { ssr: false });
const SECOMCard = dynamic(() => import("@/components/SECOMCard"), {
  ssr: false,
});

export default function Home() {
  const { lang, t } = useI18n();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />

      {/* Hero */}
      <section
        style={{
          textAlign: "center",
          padding: "5rem 1.5rem 3rem",
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        <div
          className="section-badge"
          style={{ color: "var(--accent-1)", margin: "0 auto 1rem" }}
        >
          {t("Industrial AI Showcase", "Sanoat AI Ko'rgazmasi")}
        </div>
        <h1
          style={{
            fontSize: "clamp(1.8rem, 5vw, 3rem)",
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: "1rem",
          }}
        >
          {lang === "uz" ? (
            <>
              To&apos;rtta sanoat ML modelini{" "}
              <span className="grad-text">
                hoziroq, brauzeringizda sinab ko&apos;ring.
              </span>
            </>
          ) : (
            <>
              Try four industrial ML models{" "}
              <span className="grad-text">right now, in your browser.</span>
            </>
          )}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem" }}>
          {t(
            "No server-side inference. All computation happens locally via WebAssembly. Zero data leaves your device.",
            "Server tomonidagi xulosa yo'q. Barcha hisob-kitoblar WebAssembly orqali mahalliy bajariladi. Hech qanday ma'lumot qurilmangizdan chiqmaydi."
          )}
        </p>
      </section>

      {/* Model sections */}
      <main
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "0 1.25rem 6rem",
          display: "flex",
          flexDirection: "column",
          gap: "3rem",
        }}
      >
        <section id="ppe">
          <PPECard />
        </section>

        <section id="ai4i">
          <AI4ICard />
        </section>

        <section id="ner">
          <NERCard />
        </section>

        <section id="secom">
          <SECOMCard />
        </section>
      </main>

      <footer
        style={{
          textAlign: "center",
          padding: "2rem",
          color: "var(--text-secondary)",
          fontSize: "0.8rem",
          borderTop: "1px solid var(--border)",
        }}
      >
        {t(
          "All inference runs in your browser — WebAssembly + ONNX Runtime Web.",
          "Barcha xulosa brauzeringizda ishlaydi — WebAssembly + ONNX Runtime Web."
        )}
      </footer>
    </div>
  );
}
