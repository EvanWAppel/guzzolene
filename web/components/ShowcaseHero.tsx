import { ArrowDown, ArrowUpRight } from "lucide-react";

export default function ShowcaseHero({ totalFills, since }: { totalFills: number; since: string | null }) {
  const startYear = since ? since.slice(0, 4) : null;

  return (
    <section className="showcase-hero" aria-labelledby="hero-title">
      <div className="hero-kicker"><span className="status-dot" /> A PERSONAL FUEL JOURNAL <span className="hero-edition">VOL. 01 / THE LONG RUN</span></div>
      <h1 id="hero-title" className="hero-wordmark">Guzzolene<span aria-hidden="true">✳</span></h1>
      <div className="hero-body">
        <div className="hero-copy">
          <p className="hero-headline">One car.<br />A world of <em>moving parts.</em></p>
          <p className="hero-description">Fuel economy and price trends, in context. Every fill-up tells a small part of a bigger story — about the road, the economy, and the world beyond the pump.</p>
          <a href="#the-data" className="explore-link">Explore the data <ArrowDown size={17} aria-hidden /></a>
        </div>
        <div className="hero-instrument" aria-hidden="true">
          <div className="instrument-caption"><span>THE EVERYDAY / MEASURED</span><ArrowUpRight size={18} /></div>
          <svg viewBox="0 0 440 250" className="fuel-gauge">
            <path d="M 58 211 A 162 162 0 0 1 382 211" fill="none" stroke="currentColor" strokeWidth="1" opacity=".25" />
            {Array.from({ length: 49 }, (_, i) => {
              const angle = Math.PI + (i / 48) * Math.PI;
              const major = i % 8 === 0;
              const inner = major ? 135 : 146;
              return <line key={i} x1={220 + Math.cos(angle) * inner} y1={211 + Math.sin(angle) * inner} x2={220 + Math.cos(angle) * 156} y2={211 + Math.sin(angle) * 156} stroke={i > 39 ? "var(--brand)" : "currentColor"} strokeWidth={major ? 2 : 1} />;
            })}
            <text x="35" y="236">E</text><text x="209" y="35">½</text><text x="395" y="236">F</text>
            <text x="220" y="140" textAnchor="middle" className="gauge-label">LIFE BETWEEN FILL-UPS</text>
            <path d="M 209 211 L 330 99 L 225 218 Z" fill="var(--brand)" className="gauge-needle" />
            <circle cx="220" cy="211" r="14" fill="currentColor" /><circle cx="220" cy="211" r="4" fill="var(--background)" />
          </svg>
          <div className="instrument-baseline"><span>LESS GUESSWORK.</span><span>MORE PERSPECTIVE.</span></div>
        </div>
      </div>
      <dl className="journal-stats">
        <div><dt>01 / THE RECORD</dt><dd>{totalFills > 0 ? totalFills.toLocaleString("en-US") : "—"}<span>fill-ups tracked</span></dd></div>
        <div><dt>02 / THE START</dt><dd>{startYear ?? "—"}<span>logging since</span></dd></div>
        <div><dt>03 / THE PERSPECTIVE</dt><dd>1<span>car. real-world data.</span></dd></div>
      </dl>
    </section>
  );
}
