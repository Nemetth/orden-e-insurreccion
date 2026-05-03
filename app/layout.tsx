import type { Metadata } from "next";
import { JetBrains_Mono, Playfair_Display } from "next/font/google";

import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: true,
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  fallback: ["ui-monospace", "Consolas", "monospace"],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "Orden e Insurrección",
  description:
    "Archivo vivo de worldbuilding con grafo dinámico y Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${playfair.variable} ${jetbrains.variable} font-mono antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
