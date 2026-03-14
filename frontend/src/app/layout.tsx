import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { DotGridBackground } from "@/components/layout/DotGridBackground";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "PromptForge",
  description:
    "Transform rough ideas into expert one-shot prompts using IBM Granite",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-[#0a0a0a] text-foreground`}
      >
        <ThemeProvider>
          <DotGridBackground />
          <div className="relative z-10">{children}</div>
          <Toaster
            position="top-right"
            richColors
            duration={5000}
            visibleToasts={3}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
