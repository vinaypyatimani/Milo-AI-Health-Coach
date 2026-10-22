import { Fragment, type ReactNode } from "react";

/** Minimal Markdown for Milo's replies: paragraphs, bullet lists, **bold**, *italic*. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
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

export function Markdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*([-*]|\d+\.)\s+/.test(l))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*([-*]|\d+\.)\s+/, ""))}</li>)}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l.replace(/^#+\s*/, ""))}</Fragment>)}
          </p>
        );
      })}
    </>
  );
}
