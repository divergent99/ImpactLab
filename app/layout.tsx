import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Change Impact Lab",
  description: "Evidence-backed Jira blast-radius analysis for engineering teams.",
  openGraph: {
    title: "Change Impact Lab",
    description: "Know what a change could break before the sprint does.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Change Impact Lab",
    description: "Know what a change could break before the sprint does.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
