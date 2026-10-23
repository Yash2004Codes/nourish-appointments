"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, Logo, cx } from "./ui";

const LINKS = [
  { href: "/", label: "Home", long: "Home", icon: "home" as const },
  { href: "/book", label: "Book", long: "Book a visit", icon: "plus" as const },
  { href: "/appointments", label: "Visits", long: "My visits", icon: "list" as const },
];

export default function ClientNav() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      {/* desktop / tablet: top bar */}
      <header className="sticky top-0 z-30 hidden border-b border-line/70 bg-cream/85 backdrop-blur md:block">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" aria-label="Nourish home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1" aria-label="Main">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cx(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  active(l.href) ? "bg-sage-100 text-sage-700" : "text-muted hover:text-ink",
                )}
              >
                {l.long}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* mobile: logo strip + bottom tab bar */}
      <div className="flex items-center justify-center pt-5 md:hidden">
        <Logo />
      </div>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line/80 bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-3">
          {LINKS.map((l) => {
            const on = active(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={on ? "page" : undefined}
                  className={cx("flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition", on ? "text-sage-700" : "text-muted")}
                >
                  <span className={cx("grid h-8 w-14 place-items-center rounded-full transition", on && "bg-sage-100")}>
                    <Icon name={l.icon} />
                  </span>
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
