import type { Metadata, Viewport } from "next";
import { Lexend_Deca, Poppins, Roboto_Mono } from "next/font/google";
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

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "zorotype | Practice with your split keyboard",
  description: "A typing test for Matrix layouts",
  manifest: `${basePath}/manifest.json`,
  icons: {
    icon: [
      { url: `${basePath}/icon.svg`, type: "image/svg+xml" },
      { url: `${basePath}/icon-192.png`, sizes: "192x192", type: "image/png" },
    ],
    apple: `${basePath}/icon-192.png`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#212830",
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
        className="bg-bg text-accent font-body flex flex-col items-center px-5 min-h-screen overflow-x-hidden select-none"
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
