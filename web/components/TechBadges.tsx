import { Badge } from "@/components/ui/badge";

/**
 * "Built with" strip (PRD §5.4.1) — the live stack, skimmable in ~2s. Keep this
 * list current as the stack evolves (OCR/Anthropic/Blob were removed in Stream B).
 */
const STACK = [
  "Next.js 16",
  "React Server Components",
  "TypeScript",
  "Clerk",
  "Neon Postgres",
  "Drizzle ORM",
  "Recharts",
  "Tailwind CSS",
  "PWA · offline sync",
  "Vercel",
];

export default function TechBadges() {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Built with
      </h3>
      <ul className="flex flex-wrap gap-2">
        {STACK.map((tech) => (
          <li key={tech}>
            <Badge variant="outline" className="font-normal">
              {tech}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
