import fs from "fs";
import path from "path";

export async function getStaticProps() {
  try {
    const root = process.cwd();
    const filePath = path.join(root, "plan.txt");
    let content = fs.readFileSync(filePath, "utf8");
    // Extract privacy policy section if present, else use whole file
    const start = content.indexOf("Your Privacy. Your Control.");
    if (start >= 0) content = content.slice(start);
    return { props: { content } };
  } catch (e) {
    return { props: { content: "Privacy policy content is not available right now." } };
  }
}

export default function Policy({ content }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <article className="prose prose-invert max-w-none">
          {content.split(/\n\n+/).map((para, i) => (
            <p key={i} className="text-white/90 leading-relaxed whitespace-pre-wrap">{para}</p>
          ))}
        </article>
      </div>
    </div>
  );
}
