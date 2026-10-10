import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "PromptForge Academy",
  description:
    "Learn prompt engineering by solving problems: write prompts, run them on IBM Granite against real test cases, and get coached until they hold up.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${plexSans.variable} ${plexMono.variable} font-sans antialiased bg-canvas text-fg`}
      >
        <ThemeProvider>
          {children}
          <Toaster position="bottom-right" richColors duration={5000} visibleToasts={3} />
        </ThemeProvider>
      </body>
    </html>
  );
}
