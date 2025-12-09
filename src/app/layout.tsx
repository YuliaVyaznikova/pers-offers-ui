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
  icons: {
    icon: "/logo.ico",
  },
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
              className="pointer-events-none absolute inset-x-0 -top-24 h-64 bg-gradient-to-r from-primary/35 via-accent/35 to-primary/35 blur-xl opacity-90 dark:opacity-70"
            />
            <main className="mx-auto max-w-8xl px-3 py-3">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
