import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// 1. Initialize the font
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  // This CSS variable name can now be referenced, but since your
  // globals.css handles it, we just apply the class to the body tag.
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "Jogen",
  description: "AI Regulatory Assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* 2. Apply the font class and your Tailwind theme classes */}
      <body className={`${plusJakarta.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}