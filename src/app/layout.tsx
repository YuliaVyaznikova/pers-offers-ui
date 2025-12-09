import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Personalized Offers",
  description: "Marketing optimization UI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <ThemeProvider>
          <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
            {/* Floating theme toggle in top-right */}
            <div className="fixed top-3 right-3 z-50">
              <ThemeToggle />
            </div>
            {/* Hero ribbon */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-24 h-56 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-2xl opacity-60 dark:opacity-40"
            />
            <main className="mx-auto max-w-5xl px-3 py-3">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
