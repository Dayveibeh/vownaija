import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import "./product.css";
import "./couples.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Smitten",
  description: "Find trusted wedding vendors across Nigeria and plan your celebration with confidence.",
  applicationName: "Smitten",
  icons: {
    icon: "/smitten-icon.png",
    apple: "/apple-touch-icon.png",
  },
  other: { "codex-preview": "development" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={geist.variable}>{children}</body></html>;
}
