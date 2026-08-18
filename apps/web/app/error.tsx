"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="system-error-page">
      <div><AlertTriangle /><p className="eyebrow"><span /> Something went wrong</p><h1>We couldn’t open this part of Smitten.</h1><p>Your information is safe. Try the page again, or return to the marketplace.</p><div><button className="button button-primary" onClick={reset}><RefreshCw /> Try again</button><Link href="/" className="button button-dark">Return home</Link></div></div>
    </main>
  );
}
