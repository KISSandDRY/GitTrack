import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from '../components/AppShell';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GitTrack | Advanced Engineering Dashboard",
  description: "Track and analyze developer productivity with advanced metrics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased text-foreground bg-background min-h-screen flex flex-col`}>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
