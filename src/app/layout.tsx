import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { DeviceIdInit } from "@/components/system/DeviceIdInit";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cristão Quiz — Você conhece as Escrituras?",
  description:
    "Leia o versículo, descubra a referência. Jogue sozinho ou desafie seus amigos em salas online em tempo real.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Cristão Quiz — Você conhece as Escrituras?",
    description:
      "Leia o versículo, descubra a referência. Jogue sozinho ou desafie seus amigos em salas online em tempo real.",
    siteName: "Cristão Quiz",
    locale: "pt_BR",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cristão Quiz",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1026",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <ServiceWorkerRegister />
        <DeviceIdInit />
        {children}
      </body>
    </html>
  );
}
