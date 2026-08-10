import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { UserProvider } from "@/src/context/UserContext";
import { ChatProvider } from "@/src/context/ChatContext";

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
      <body className={`${plusJakarta.className} antialiased`}>
        <UserProvider>
          <ChatProvider>
            {children}
            <Toaster position="bottom-right" />
          </ChatProvider>
        </UserProvider>
      </body>
    </html>
  );
}