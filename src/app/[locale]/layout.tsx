import type { Metadata, Viewport } from "next";
import { Inter, Outfit, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ThemeProvider } from "@/components/theme-provider";
import { AuthSessionProvider } from "@/components/session-provider";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const sansFont = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const serifFont = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif-ghardaia",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-ghardaia",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "SYNCLOUDPOS",
  description: "Système ERP complet — Point de Vente, Facturation, Gestion Commerciale et Conformité Fiscale Algérienne",
  applicationName: "SYNCLOUDPOS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SYNCLOUDPOS",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#b3593b" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${inter.variable} ${sansFont.variable} ${serifFont.variable} ${monoFont.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <AuthSessionProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
              themes={["light", "dark", "ghardaia", "ghardaia-dark", "riviera", "riviera-dark", "atlas", "atlas-dark", "horizon", "horizon-dark"]}
            >
              {children}
            </ThemeProvider>
          </AuthSessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
