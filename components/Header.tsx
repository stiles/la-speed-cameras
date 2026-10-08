import Link from "next/link";
import MobileMenu from "./MobileMenu";

const NAV = [
  { href: "/neighborhoods", label: "Neighborhoods" },
  { href: "/route", label: "My commute" },
  { href: "/list", label: "Full list" },
  { href: "/about", label: "About" },
];

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-lg font-extrabold tracking-tight ${className}`}>
      <span aria-hidden className="relative inline-grid size-7 place-items-center rounded-full bg-siren text-white">
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
          <path d="M4 7h11a2 2 0 0 1 2 2v1.2l3.4-2a1 1 0 0 1 1.6.8v6a1 1 0 0 1-1.6.8l-3.4-2V15a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
        </svg>
      </span>
      LA Speed Cameras
    </span>
  );
}

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink text-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="LA Speed Cameras home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm max-sm:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <MobileMenu items={NAV} />
      </div>
    </header>
  );
}
