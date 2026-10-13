import App from "@/components/App";
import { SITE_H1 } from "@/lib/seo";

export default function Page() {
  return (
    <>
      {/* The visible brand mark is a clickable div, so the page needs a real heading of its own. */}
      <h1 className="sr-only">{SITE_H1}</h1>
      <App />
    </>
  );
}
