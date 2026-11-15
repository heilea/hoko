import type { Metadata } from "next";
import localFont from "next/font/local";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "./globals.css";

// Polices Fontshare (ITF Free Font License), hébergées avec le site.
const clash = localFont({
  variable: "--font-clash",
  display: "swap",
  src: [
    { path: "../fonts/ClashDisplay-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/ClashDisplay-700.woff2", weight: "700", style: "normal" },
  ],
});

const satoshi = localFont({
  variable: "--font-satoshi",
  display: "swap",
  src: [
    { path: "../fonts/Satoshi-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Satoshi-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Satoshi-700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/Satoshi-900.woff2", weight: "900", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: {
    default: "Hoko · Petites annonces en Polynésie française",
    template: "%s · Hoko",
  },
  description:
    "Petites annonces gratuites entre particuliers et annuaire des professionnels, de Tahiti aux îles.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${clash.variable} ${satoshi.variable}`}>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
