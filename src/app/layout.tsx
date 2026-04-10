import type { Metadata } from "next";
import { LangProvider } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Factory AI — Industrial ML in Your Browser",
  description:
    "Four industrial machine-learning models running entirely client-side: PPE detection, predictive maintenance, NER, and semiconductor fault detection.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
