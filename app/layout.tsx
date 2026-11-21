import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import "./visual.css";
import { I18nProvider } from "@/components/I18n";
import { getLang } from "@/lib/serverLang";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans" });

export const dynamic = "force-dynamic"; // every page reads live shared state

export const metadata: Metadata = {
  title: "My BMC Rasta · Mumbai road complaints, followed to the rupee",
  description: "Report a road problem in a minute, track it, and see where your ward's repair money goes.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={sans.variable}>
      <body>
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
