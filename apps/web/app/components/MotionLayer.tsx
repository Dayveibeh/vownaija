"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const REVEAL_SELECTOR = [
  ".hero-copy > *",
  ".hero-visual",
  ".section-heading",
  ".category-card",
  ".vendor-card",
  ".story-image",
  ".story-copy > *",
  ".location-copy > *",
  ".location-list button",
  ".vendor-cta > *",
  ".ai-match-cta > *",
  ".couple-dash-heading > *",
  ".couple-ai-banner",
  ".couple-stat-grid article",
  ".couple-dash-card",
  ".dash-page-heading > *",
  ".stat-grid article",
  ".dash-card",
  ".overview-grid > *",
].join(",");

export function MotionLayer() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("smitten-route-ready");
    const frame = window.requestAnimationFrame(() => root.classList.add("smitten-route-ready"));

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elements = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));

    elements.forEach((element, index) => {
      element.classList.add("smitten-reveal");
      element.style.setProperty("--reveal-delay", `${Math.min(index % 8, 5) * 42}ms`);
      if (reduceMotion) element.classList.add("is-visible");
    });

    if (reduceMotion) {
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    elements.forEach((element) => observer.observe(element));

    const hoverTargets = Array.from(document.querySelectorAll<HTMLElement>(
      ".button, .search-button, .vendor-profile-button, .category-card, .vendor-card, .couple-dash-card, .dash-card, .couple-stat-grid article, .stat-grid article"
    ));

    const cleanup: Array<() => void> = [];
    for (const target of hoverTargets) {
      const onPointerMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        const rect = target.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
        target.style.setProperty("--pointer-x", `${x}%`);
        target.style.setProperty("--pointer-y", `${y}%`);
      };
      const onPointerLeave = () => {
        target.style.removeProperty("--pointer-x");
        target.style.removeProperty("--pointer-y");
      };
      target.addEventListener("pointermove", onPointerMove);
      target.addEventListener("pointerleave", onPointerLeave);
      cleanup.push(() => {
        target.removeEventListener("pointermove", onPointerMove);
        target.removeEventListener("pointerleave", onPointerLeave);
      });
    }

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      cleanup.forEach((fn) => fn());
    };
  }, [pathname]);

  return null;
}
