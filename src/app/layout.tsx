import type { Metadata, Viewport } from "next";
import { Lexend_Deca, Poppins, Roboto_Mono } from "next/font/google";
import {
  AUTHOR_NAME,
  COMPANY_NAME,
  OG_ALT,
  PORTFOLIO_URL,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  STRUCTURED_DATA,
  assetUrl,
} from "@/lib/seo";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/themes";
import "./globals.css";

const lexendDeca = Lexend_Deca({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-lexend-deca",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-roboto-mono",
  display: "swap",
});

export const metadata: Metadata = {
  // Every relative URL below resolves against the canonical origin, so the copy deployed on
  // GitHub Pages points search engines and social cards at the same place the Vercel build does.
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [...SITE_KEYWORDS],
  category: "education",
  creator: AUTHOR_NAME,
  publisher: COMPANY_NAME,
  authors: [{ name: AUTHOR_NAME, url: PORTFOLIO_URL }],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // The card itself is rendered at /og.png (app/og.png/route.tsx) at build time.
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    images: [{ url: "/og.png", width: 1200, height: 630, type: "image/png", alt: OG_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/og.png", type: "image/png", alt: OG_ALT }],
  },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false, email: false, address: false },
  // Icons and the manifest stay on whichever deployment is serving this build, so the installable
  // PWA keeps working on the Pages mirror.
  manifest: assetUrl("/manifest.json"),
  icons: {
    icon: [
      { url: assetUrl("/icon.svg"), type: "image/svg+xml" },
      { url: assetUrl("/icon-192.png"), sizes: "192x192", type: "image/png" },
    ],
    apple: assetUrl("/icon-192.png"),
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#212830",
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${lexendDeca.variable} ${poppins.variable} ${robotoMono.variable}`}
      suppressHydrationWarning
    >
      {/* Both suppressions cover attributes that legitimately differ before hydration:
          <html> gets its style attribute from the theme bootstrap script below, and <body>
          gets stamped by browser extensions (Grammarly adds data-gr-ext-installed and
          data-new-gr-c-s-check-loaded), which React would otherwise report as a mismatch. */}
      <body
        className="bg-bg text-accent font-body selection:bg-accent selection:text-bg flex flex-col items-center px-5 min-h-screen overflow-x-hidden"
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        {children}
      </body>
    </html>
  );
}
