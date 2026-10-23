import { Fragment, type ReactNode } from "react";

/**
 * Minimal Markdown for Milo's replies: headings, paragraphs, bullet and
 * numbered lists, **bold** and *italic*. Works line by line, so a heading
 * followed directly by a list (no blank line) still renders correctly.
 */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    out.push(t.startsWith("**") ? <strong key={m.index}>{t.slice(2, -2)}</strong> : <em key={m.index}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { kind: "h"; text: string }
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

const BULLET = /^\s*[-*•]\s+/;
const NUMBER = /^\s*\d+[.)]\s+/;

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.trim().split("\n")) {
    const line = raw.trimEnd();
    const prev = blocks[blocks.length - 1];
    if (!line.trim()) { blocks.push({ kind: "p", lines: [] }); continue; }   // a blank line ends the block
    if (/^#{1,6}\s/.test(line)) { blocks.push({ kind: "h", text: line.replace(/^#+\s*/, "") }); continue; }
    const list = BULLET.test(line) ? "ul" : NUMBER.test(line) ? "ol" : null;
    if (list) {
      const item = line.replace(list === "ul" ? BULLET : NUMBER, "");
      if (prev && (prev.kind === "ul" || prev.kind === "ol") && prev.kind === list) prev.items.push(item);
      else blocks.push({ kind: list, items: [item] });
      continue;
    }
    if (prev && prev.kind === "p" && prev.lines.length) prev.lines.push(line);
    else blocks.push({ kind: "p", lines: [line] });
  }
  return blocks.filter((b) => b.kind !== "p" || b.lines.length);
}

export function Markdown({ text }: { text: string }) {
  return (
    <>
      {parse(text).map((b, i) => {
        if (b.kind === "h") return <h3 key={i} className="md-h">{inline(b.text)}</h3>;
        if (b.kind === "ul") return <ul key={i}>{b.items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>;
        if (b.kind === "ol") return <ol key={i}>{b.items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ol>;
        return <p key={i}>{b.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>;
      })}
    </>
  );
}
