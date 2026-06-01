// Tiny, dependency-free markdown renderer for coaching briefs.
// Handles headings (#, ##), bold (**), and paragraphs / line breaks.

function inline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    const m = p.match(/^\*\*([^*]+)\*\*$/);
    if (m) return <strong key={i} className="font-semibold text-white">{m[1]}</strong>;
    return <span key={i}>{p}</span>;
  });
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2 text-sm leading-relaxed text-[#c9d4e0]">
      {lines.map((line, i) => {
        const t = line.trim();
        if (!t) return null;
        if (t.startsWith("## ")) return <h3 key={i} className="text-base font-semibold text-white">{inline(t.slice(3))}</h3>;
        if (t.startsWith("# ")) return <h2 key={i} className="text-lg font-semibold text-white">{inline(t.slice(2))}</h2>;
        if (t.startsWith("- ")) return <p key={i} className="pl-3">• {inline(t.slice(2))}</p>;
        return <p key={i}>{inline(t)}</p>;
      })}
    </div>
  );
}
