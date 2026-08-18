import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./product.css";
import "./couples.css";
import "./vercel-theme.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

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
  const content = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    ? <ClerkProvider>{children}</ClerkProvider>
    : children;

  return <html lang="en"><body className={`${geist.variable} ${geistMono.variable}`}>{content}</body></html>;
}
