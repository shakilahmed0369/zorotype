import Link from "next/link";
import { SITE_NAME } from "@/lib/seo";

// Static export ships this as 404.html, which both hosts serve for unknown paths. Next marks the
// route noindex by itself, so a typo never turns into a soft 404 in search results.
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-brand text-[2.2rem] leading-none text-correct">Page not found</h1>
      <p className="max-w-[46ch] text-sm text-muted">
        That address is not part of {SITE_NAME}. The typing trainer lives on the home page.
      </p>
      <Link
        href="/"
        className="bg-accent text-bg rounded-lg px-4 py-[10px] text-sm font-bold transition-colors duration-300 hover:text-bg"
      >
        Back to the trainer
      </Link>
    </main>
  );
}
