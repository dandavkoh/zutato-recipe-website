import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import NicknameGuard from '@/components/NicknameGuard';
import KlaroConsent from '../components/KlaroConsent';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: "ZUTATO - Die beste Rezept-Community",
  description: "Entdecke die besten Rezepte von Hobbyköchen und Profis. Teile deine Lieblingsrezepte und lerne neue Koch-Techniken.",
  keywords: "Rezepte, Kochen, Koch-Community, Koch-Tipps, Küche, Essen",
  authors: [{ name: "ZUTATO Team" }],
  openGraph: {
    title: "ZUTATO - Die beste Rezept-Community",
    description: "Entdecke die besten Rezepte von Hobbyköchen und Profis.",
    type: "website",
    locale: "de_DE",
    siteName: "ZUTATO",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        <link 
          rel="stylesheet" 
          href="/fontawesome/css/all.min.css" 
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <AuthProvider>
          <Header />
          <KlaroConsent />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <NicknameGuard />
        </AuthProvider>
      </body>
    </html>
  );
}
