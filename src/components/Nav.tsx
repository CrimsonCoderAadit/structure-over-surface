"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";

const LINKS = [
  { href: "/methodology", label: "Methodology" },
  { href: "/results", label: "Results" },
  { href: "/findings", label: "Findings" },
  { href: "/demo", label: "Demo" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border-color/60 bg-bg/80 backdrop-blur-md">
      <nav className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-display text-[1.05rem] tracking-tight text-text hover:text-edge-structural transition-colors"
        >
          Structure Over Surface
        </Link>

        <ul className="hidden md:flex items-center gap-8 font-mono text-[0.8rem]">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={clsx(
                    "relative py-1 transition-colors",
                    active ? "text-text" : "text-text-dim hover:text-text"
                  )}
                >
                  {link.label}
                  {active && (
                    <span className="absolute -bottom-[1px] left-0 right-0 h-[1.5px] bg-edge-structural" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          className="md:hidden flex flex-col gap-1.5 p-2"
        >
          <span className="w-5 h-px bg-text" />
          <span className="w-5 h-px bg-text" />
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-border-color bg-bg px-5 py-4 flex flex-col gap-4 font-mono text-sm">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="text-text-dim">
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
