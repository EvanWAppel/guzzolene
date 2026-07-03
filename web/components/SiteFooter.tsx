import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

/**
 * Identity footer (PRD §5.4.1, G-11/G-12). Author identity + links + the demo
 * CTA. Polish-first / understated per the product-first tone. No contact form
 * (PRD §7) — mailto + social links only.
 */
const LINKS = [
  { label: "GitHub repo", href: "https://github.com/EvanWAppel/guzzolene" },
  { label: "GitHub profile (@EvanWAppel)", href: "https://github.com/EvanWAppel" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/evan-appel-8885569b/",
  },
  { label: "Resume (PDF)", href: "/resume.pdf" },
  { label: "Email", href: "mailto:appelew@gmail.com" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t mt-16">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="font-semibold">Evan Appel</p>
          <p className="text-sm text-muted-foreground max-w-md">
            I build with AI agents to make data reliably accessible. Guzzolene is
            one of several personal projects.
          </p>
        </div>

        <div className="space-y-4 sm:text-right">
          <Link href="/demo" className={cn(buttonVariants())}>
            Try the live demo
          </Link>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 sm:justify-end text-sm">
            {LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
