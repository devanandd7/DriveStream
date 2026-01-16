import fs from "fs";
import path from "path";

function parseTerms(raw) {
  const lines = raw.replace(/\r\n?/g, "\n");
  const titleMatch = lines.match(/^\s*(Terms of Service)\s*$/im);
  const updatedMatch = lines.match(/^(Last\s+updated\s*:\s*)(.+)$/im);

  const updated = updatedMatch ? updatedMatch[2].trim() : "";

  // Hero intro: content before first numbered heading (e.g., "1. ...")
  const firstHeadingIdx = lines.search(/^\s*\d+\.\s+/m);
  const hero = firstHeadingIdx > 0 ? lines.slice(0, firstHeadingIdx).trim() : "";

  // Extract numbered sections as { heading, body }
  const sectionRegex = /^\s*(\d+\.\s+[^\n]+)\s*\n([\s\S]*?)(?=^\s*\d+\.\s+|\Z)/gm;
  const sections = [];
  let m;
  while ((m = sectionRegex.exec(lines)) !== null) {
    const heading = m[1].trim();
    const body = m[2].trim();
    if (heading || body) sections.push({ heading, body });
  }

  return { title: titleMatch ? titleMatch[1] : "Terms of Service", updated, hero, sections };
}

export async function getStaticProps() {
  try {
    const root = process.cwd();
    const candidates = [
      path.join(root, "public", "terms.txt"),
      path.join(root, "terms.txt"),
      path.join(root, "..", "terms.txt"),
      path.join(root, "..", "..", "terms.txt"),
    ];
    let raw = "";
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        raw = fs.readFileSync(p, "utf8");
        break;
      }
    }
    if (!raw) {
      raw = "Terms of Service\n\nThese Terms govern your access to and use of DriveStream. By using the service, you agree to these Terms.";
    }

    const parsed = parseTerms(raw);
    const hasStructured = parsed.hero || (parsed.sections && parsed.sections.length > 0);
    return { props: { raw: hasStructured ? "" : raw, parsed } };
  } catch (e) {
    return { props: { raw: "Terms are temporarily unavailable.", parsed: { title: "Terms of Service", updated: "", hero: "", sections: [] } } };
  }
}

export default function Terms({ raw, parsed }) {
  const { title, updated, hero, sections } = parsed || { title: "Terms of Service", updated: "", hero: "", sections: [] };
  const showFallback = !hero && (!sections || sections.length === 0) && !!raw;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{title}</h1>
          {updated && <div className="mt-1 text-xs text-white/60">Last Updated: {updated}</div>}
          {hero && <p className="mt-4 text-white/80 max-w-3xl whitespace-pre-wrap">{hero}</p>}
        </div>

        {/* Numbered Sections as cards */}
        {sections && sections.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((s, idx) => (
              <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                {s.heading && <h2 className="text-lg font-semibold mb-2">{s.heading}</h2>}
                {s.body && <div className="text-sm text-white/80 whitespace-pre-wrap">{s.body}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Fallback full content */}
        {showFallback && (
          <article className="prose prose-invert max-w-none mt-6">
            {raw.split(/\n\n+/).map((para, i) => (
              <p key={i} className="text-white/90 leading-relaxed whitespace-pre-wrap">{para}</p>
            ))}
          </article>
        )}

        {/* Contact Card */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold mb-2">Contact</h2>
          <div className="text-sm text-white/80 space-y-1">
            <div>Email: <a className="text-blue-300 hover:text-blue-200 underline" href="mailto:devanandutkarsh7@gmail.com">devanandutkarsh7@gmail.com</a></div>
            <div>Website: <a className="text-blue-300 hover:text-blue-200 underline" href="https://thedrivestream.vercel.app/" target="_blank" rel="noreferrer">https://thedrivestream.vercel.app/</a></div>
          </div>
        </div>
      </div>
    </div>
  );
}
