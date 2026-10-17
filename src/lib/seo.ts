import { APP_VERSION } from "./storage";

// Everything a crawler or a social card needs in one place, so the origin and the wording only
// exist once. The canonical origin is the Vercel deployment; the GitHub Pages copy keeps working
// but points its canonical tags here so only one copy is indexed.
export const SITE_URL = "https://zorotype.vercel.app";
export const SITE_NAME = "Zorotype";
export const SITE_TITLE = "Zorotype — ZMK split keyboard typing trainer";
export const SITE_H1 = "Zorotype — the typing trainer for split, ergonomic and matrix keyboards";
export const SITE_DESCRIPTION =
  "Practice typing on your split, ergonomic or matrix keyboard: ZMK layer-aware keycaps, 87 board layouts, real code snippets in 8 languages, Monkeytype-style WPM scoring. Free, no account.";

export const AUTHOR_NAME = "Shakil Ahmed";
export const AUTHOR_HANDLE = "shakilahmed0369";
export const AUTHOR_URL = "https://github.com/shakilahmed0369";
export const PORTFOLIO_URL = "https://algovar.com";
export const COMPANY_NAME = "Algovar";
export const COMPANY_URL = "https://algovar.com";
/** Short form for visible credits, e.g. the footer. */
export const COMPANY_LABEL = "algovar.com";

export const SITE_KEYWORDS = [
  "ZMK typing trainer",
  "split keyboard typing practice",
  "layered keyboard trainer",
  "Corne typing test",
  "Glove80 typing practice",
  "ZSA Voyager trainer",
  "Colemak-DH practice",
  "QMK keymap visualizer",
  "Monkeytype alternative",
  "ergonomic keyboard typing test",
  "practice typing code",
  "code typing practice",
];

export const OG_ALT = "Zorotype — a ZMK typing trainer for split and ergonomic keyboards";
export const OG_FEATURES = ["Corne", "Glove80", "Voyager", "ZMK layers", "Code practice", "WPM scoring"];

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Icons and the web manifest have to be same-origin with the page that declares them (a browser
// ignores a cross-origin manifest), so they follow whichever deployment this build is for, while
// the canonical and Open Graph tags always name the primary origin above.
const PAGES_ORIGIN = "https://shakilahmed0369.github.io";

export function assetUrl(path: string): string {
  return `${BASE_PATH ? `${PAGES_ORIGIN}${BASE_PATH}` : SITE_URL}${path}`;
}

// Structured data for search engines: what the app is, that it is free, what it does, and who
// stands behind it. The nodes reference each other by @id so the app, the author and the company
// read as one entity graph instead of three loose facts.
const APP_ID = `${SITE_URL}/#app`;
const AUTHOR_ID = `${SITE_URL}/#author`;
const COMPANY_ID = `${SITE_URL}/#company`;

export const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": APP_ID,
      name: SITE_NAME,
      alternateName: "zorotype",
      url: `${SITE_URL}/`,
      description: SITE_DESCRIPTION,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      inLanguage: "en",
      isAccessibleForFree: true,
      softwareVersion: APP_VERSION,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "On-screen keyboard that follows the firmware layer you are typing on",
        "86-board keyboard library, plus QMK info.json and Keymap Editor imports",
        "Monkeytype-style scoring with WPM, accuracy and per-key heatmaps",
        "Mistake drills, six practice languages and every Monkeytype theme",
        "Code practice: 64 source snippets across 8 programming languages, covering every key",
      ],
      author: { "@id": AUTHOR_ID },
      creator: { "@id": AUTHOR_ID },
      publisher: { "@id": COMPANY_ID },
      copyrightHolder: { "@id": COMPANY_ID },
    },
    {
      "@type": "Person",
      "@id": AUTHOR_ID,
      name: AUTHOR_NAME,
      alternateName: AUTHOR_HANDLE,
      url: PORTFOLIO_URL,
      sameAs: [AUTHOR_URL],
      worksFor: { "@id": COMPANY_ID },
    },
    {
      "@type": "Organization",
      "@id": COMPANY_ID,
      name: COMPANY_NAME,
      url: COMPANY_URL,
    },
  ],
};
