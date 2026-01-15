import fs from "fs";
import path from "path";

function sectionBetween(text, startMarker, endMarkerOptions) {
  const start = text.indexOf(startMarker);
  if (start < 0) return "";
  let end = text.length;
  for (const m of endMarkerOptions) {
    const i = text.indexOf(m, start + startMarker.length);
    if (i >= 0 && i < end) end = i;
  }
  return text.slice(start + startMarker.length, end).trim();
}

export async function getStaticProps() {
  try {
    const root = process.cwd();
    const candidates = [
      path.join(root, "plan.txt"),
      path.join(root, "..", "plan.txt"),
      path.join(root, "..", "..", "plan.txt"),
    ];
    let raw = "";
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        raw = fs.readFileSync(p, "utf8");
        break;
      }
    }
    if (!raw) {
      raw = "Your Privacy. Your Control.\n\nWe respect your data. We use it only to give you a better experience — strictly with your permission.";
    }

    const hero = "Your Privacy. Your Control.";
    const heroText = sectionBetween(raw, hero, ["We never sell data", "Limited Access", "Total Control", "1. What Data We Collect"]);

    const neverSell = sectionBetween(raw, "We never sell data", ["Limited Access", "Total Control", "1. What Data We Collect"]);
    const limited = sectionBetween(raw, "Limited Access", ["Total Control", "1. What Data We Collect"]);
    const control = sectionBetween(raw, "Total Control", ["1. What Data We Collect", "2. Why We Use Your Data"]);

    const collect = sectionBetween(raw, "1. What Data We Collect", ["2. Why We Use Your Data"]);
    const why = sectionBetween(raw, "2. Why We Use Your Data", ["We Never Sell Your Data", "3. Third-Party Services"]);
    const neverSellQuote = sectionBetween(raw, "We Never Sell Your Data", ["3. Third-Party Services", "4. Security Measures"]);
    const third = sectionBetween(raw, "3. Third-Party Services", ["4. Security Measures"]);
    const security = sectionBetween(raw, "4. Security Measures", ["Questions?", "Last Updated"]);
    const questions = sectionBetween(raw, "Questions?", ["Last Updated"]);
    const updated = sectionBetween(raw, "Last Updated:", []);

    const cards = { neverSell, limited, control };
    const sections = { collect, why, neverSellQuote, third, security, questions, updated };
    const hasAny = heroText || Object.values(cards).some(Boolean) || Object.values(sections).some(Boolean);
    return {
      props: {
        heroText,
        cards,
        sections,
        raw: hasAny ? "" : raw,
      },
    };
  } catch (e) {
    return { props: { heroText: "", cards: {}, sections: {}, raw: "We respect your privacy. Policy content is temporarily unavailable." } };
  }
}

export default function Policy({ heroText, cards, sections, raw }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          {heroText && <p className="mt-3 text-white/80 max-w-3xl whitespace-pre-wrap">{heroText}</p>}
        </div>

        {/* Key principles cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {cards?.neverSell && (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
              <div className="text-sm font-semibold mb-2">We never sell data</div>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{cards.neverSell}</p>
            </div>
          )}
          {cards?.limited && (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
              <div className="text-sm font-semibold mb-2">Limited Access</div>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{cards.limited}</p>
            </div>
          )}
          {cards?.control && (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
              <div className="text-sm font-semibold mb-2">Total Control</div>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{cards.control}</p>
            </div>
          )}
        </div>

        {/* Details sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections?.collect && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold mb-2">1. What Data We Collect</h2>
              <div className="text-sm text-white/80 whitespace-pre-wrap">{sections.collect}</div>
            </div>
          )}
          {sections?.why && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold mb-2">2. Why We Use Your Data</h2>
              <div className="text-sm text-white/80 whitespace-pre-wrap">{sections.why}</div>
            </div>
          )}
          {sections?.neverSellQuote && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 col-span-1 md:col-span-2">
              <blockquote className="text-sm text-white/90 italic">{sections.neverSellQuote}</blockquote>
            </div>
          )}
          {sections?.third && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold mb-2">3. Third-Party Services.</h2>
              <div className="text-sm text-white/80 whitespace-pre-wrap">{sections.third}</div>
            </div>
          )}
          {sections?.security && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold mb-2">4. Security Measures</h2>
              <div className="text-sm text-white/80 whitespace-pre-wrap">{sections.security}</div>
            </div>
          )}
          {sections?.questions && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold mb-2">Questions?</h2>
              <div className="text-sm text-white/80 whitespace-pre-wrap">{sections.questions}</div>
            </div>
          )}
        </div>

        {sections?.updated && (
          <div className="mt-8 text-xs text-white/60">Last Updated: {sections.updated}</div>
        )}

        {/* Fallback full content if parsing failed */}
        {!heroText && !Object.values(cards || {}).some(Boolean) && !Object.values(sections || {}).some(Boolean) && raw && (
          <article className="prose prose-invert max-w-none mt-6">
            {raw.split(/\n\n+/).map((para, i) => (
              <p key={i} className="text-white/90 leading-relaxed whitespace-pre-wrap">{para}</p>
            ))}
          </article>
        )}



      </div>
    </div>
  );
}
