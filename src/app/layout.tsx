import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PWARegister } from "@/components/PWARegister";
import { InstallPWAButton } from "@/components/InstallPWAButton";
import { SysteemMeldingLader } from "@/components/SysteemMeldingLader";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Noah ATS",
  description: "Het ATS-platform voor recruitment bureaus",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Noah",
    statusBarStyle: "default",
  },
  // Cache-busting (?v=2) zodat Chrome de favicon opnieuw download na deploy.
  // Bump dit nummer wanneer het icoon wijzigt.
  icons: {
    icon: [
      { url: "/icon-192.png?v=2", type: "image/png", sizes: "192x192" },
      { url: "/icon-192.svg", type: "image/svg+xml" },
    ],
    apple: "/icon-192.png?v=2",
    shortcut: "/icon-192.png?v=2",
  },
};

export const viewport: Viewport = {
  themeColor: "#333399",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      className={`${jakartaSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Pas vóór de body de saved theme toe om flicker te voorkomen */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('noah-theme');if(t==='dark'){document.documentElement.classList.add('dark')}else if(t==='system'){if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark')}}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <PWARegister />
        <SysteemMeldingLader />
        {children}
        <InstallPWAButton />
      </body>
    </html>
  );
}
