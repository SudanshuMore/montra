import type { Metadata } from "next";
import "./globals.css";
import "./montra.css";

export const metadata: Metadata = {
  title: "Montra · Banking & evidence",
  description: "Private banking and transaction evidence pilot. Synthetic data only.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
