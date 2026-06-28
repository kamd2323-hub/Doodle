import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reclaim AI - Automated Invoice Recovery",
  description: "Turn past-due invoices into paid ones using personalized, smart email sequences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-slate-50/80">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-slate-500">
                &copy; {new Date().getFullYear()} Reclaim AI. All rights reserved.
              </p>
              <nav className="flex items-center gap-6">
                <Link
                  href="/privacy"
                  className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Terms of Service
                </Link>
              </nav>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}