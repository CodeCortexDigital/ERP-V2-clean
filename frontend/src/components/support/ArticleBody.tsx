import { Fragment } from 'react';

/** Help article text: "## " heading, "- " bullet, "1. " numbered step, blank line = new paragraph. No HTML is used. */
export default function ArticleBody({ text }: { text: string }) {
  // A heading line starts its own block, even with no blank line after it.
  const blocks = text.replace(/\r\n/g, '\n').replace(/^(## .*)\n(?!\n)/gm, '$1\n\n').split(/\n{2,}/);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-700">
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter((l) => l.trim());
        if (lines.length === 1 && lines[0].startsWith('## ')) {
          return <h3 key={i} className="pt-2 text-base font-bold text-slate-900">{lines[0].slice(3)}</h3>;
        }
        if (lines.every((l) => /^\d+\.\s/.test(l))) {
          return <ol key={i} className="list-decimal space-y-1 ps-5">{lines.map((l, j) => <li key={j}>{l.replace(/^\d+\.\s/, '')}</li>)}</ol>;
        }
        if (lines.every((l) => l.startsWith('- '))) {
          return <ul key={i} className="list-disc space-y-1 ps-5">{lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>;
        }
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{l}</Fragment>)}</p>;
      })}
    </div>
  );
}
