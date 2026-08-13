import Image from "next/image";
import Link from "next/link";

export function Brand({ light = false, priority = false }: { light?: boolean; priority?: boolean }) {
  return (
    <Link href="/" className={light ? "brand brand-light" : "brand"} aria-label="Smitten home">
      <span className="brand-logo-shell">
        <Image className="brand-logo" src="/smitten-wordmark.png" width={782} height={142} alt="Smitten" priority={priority} />
      </span>
    </Link>
  );
}
