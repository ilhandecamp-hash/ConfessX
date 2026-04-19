// Markdown-lite sécurisé : bold / italic / autolink.
// React auto-échappe les strings — pas de risque d'injection HTML.

import type { ReactNode } from "react";

const URL_RX = /\bhttps?:\/\/[^\s<>]+[^\s<>.,!?)]/gi;

// Gestion ultra-simple : on découpe en segments alternant text / url.
// Puis on applique bold/italic sur chaque segment text.
export function renderRichText(raw: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  const text = raw;
  const matches = [...text.matchAll(URL_RX)];

  for (const m of matches) {
    const start = m.index ?? 0;
    if (start > lastIndex) {
      parts.push(...renderInlines(text.slice(lastIndex, start), key));
      key += 10;
    }
    const url = m[0];
    parts.push(
      <a
        key={`u${key++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-brand underline underline-offset-2 hover:text-brand-hover"
      >
        {url.replace(/^https?:\/\//, "")}
      </a>,
    );
    lastIndex = start + url.length;
  }
  if (lastIndex < text.length) {
    parts.push(...renderInlines(text.slice(lastIndex), key));
  }
  return parts;
}

// Applique **bold** et *italic* dans un segment sans URL.
function renderInlines(seg: string, baseKey: number): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = seg;
  let k = 0;

  // **bold**
  while (rest.length) {
    const mBold = /\*\*([^*\n]+?)\*\*/.exec(rest);
    const mItal = /(^|[^*])\*([^*\n]+?)\*(?!\*)/.exec(rest);
    const next =
      mBold && (!mItal || (mBold.index ?? 0) <= (mItal.index ?? 0))
        ? { tag: "b" as const, m: mBold, prefixLen: 0 }
        : mItal
          ? { tag: "i" as const, m: mItal, prefixLen: mItal[1].length }
          : null;
    if (!next) {
      out.push(<span key={`t${baseKey}-${k++}`}>{rest}</span>);
      break;
    }
    const start = (next.m.index ?? 0) + next.prefixLen;
    if (start > 0) {
      out.push(<span key={`t${baseKey}-${k++}`}>{rest.slice(0, start)}</span>);
    }
    const inner = next.tag === "b" ? next.m[1] : next.m[2];
    out.push(
      next.tag === "b" ? (
        <strong key={`t${baseKey}-${k++}`} className="font-bold">
          {inner}
        </strong>
      ) : (
        <em key={`t${baseKey}-${k++}`} className="italic">
          {inner}
        </em>
      ),
    );
    const consumed =
      start + (next.tag === "b" ? next.m[0].length : next.m[0].length - next.prefixLen);
    rest = rest.slice(consumed);
  }

  return out;
}
