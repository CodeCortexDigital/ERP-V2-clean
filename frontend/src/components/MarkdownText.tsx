import React from 'react';

/**
 * Minimal markdown renderer for assistant replies: headings, bold/italic/code,
 * bullet & numbered lists and pipe tables. Builds React elements only (no raw
 * HTML), so model output can never inject markup.
 */

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith('**')) parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('`')) parts.push(<code key={key} className="px-1 rounded bg-slate-100 text-[11px]">{token.slice(1, -1)}</code>);
    else parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

const isTableRow = (line: string) => /^\s*\|.*\|\s*$/.test(line);
const isDivider = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

export default function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const key = `b${i}`;

    if (isTableRow(line) && i + 1 < lines.length && isDivider(lines[i + 1])) {
      const header = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]));
      blocks.push(
        <div key={key} className="overflow-x-auto my-1">
          <table className="text-[11px] border-collapse">
            <thead>
              <tr>{header.map((h, j) => <th key={j} className="border border-slate-200 px-2 py-1 text-left font-semibold bg-slate-50">{renderInline(h, `${key}h${j}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, j) => <td key={j} className="border border-slate-200 px-2 py-1">{renderInline(c, `${key}r${ri}c${j}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const bullet = /^\s*(?:[-*•])\s+(.*)$/;
    const numbered = /^\s*\d+[.)]\s+(.*)$/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line) && !bullet.test(line);
      const re = ordered ? numbered : bullet;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].replace(re, '$1'));
      const Tag = ordered ? 'ol' : 'ul';
      blocks.push(
        <Tag key={key} className={`${ordered ? 'list-decimal' : 'list-disc'} pl-4 my-1 space-y-0.5`}>
          {items.map((it, j) => <li key={j}>{renderInline(it, `${key}i${j}`)}</li>)}
        </Tag>,
      );
      continue;
    }

    const heading = /^\s*#{1,6}\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push(<p key={key} className="font-semibold mt-1">{renderInline(heading[1], key)}</p>);
    } else if (line.trim()) {
      blocks.push(<p key={key}>{renderInline(line, key)}</p>);
    } else {
      blocks.push(<div key={key} className="h-1.5" />);
    }
    i++;
  }
  return <div className="space-y-0.5 break-words">{blocks}</div>;
}
