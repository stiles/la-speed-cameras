import Link from "next/link";

type Props = {
  kicker?: string;
  title: string;
  lede?: React.ReactNode;
  crumbs?: { href: string; label: string }[];
  children?: React.ReactNode;
};

export default function PageHeader({ kicker, title, lede, crumbs, children }: Props) {
  return (
    <section className="bg-ink text-white">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-6">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-white/60">
            {crumbs.map((c, i) => (
              <span key={c.href}>
                {i > 0 && <span className="mx-2">/</span>}
                <Link href={c.href} className="hover:text-white">{c.label}</Link>
              </span>
            ))}
          </nav>
        )}
        {kicker && <p className="mb-2 text-sm font-bold uppercase tracking-widest text-siren">{kicker}</p>}
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
        {lede && <p className="mt-4 max-w-3xl text-lg text-white/85">{lede}</p>}
        {children}
      </div>
    </section>
  );
}
