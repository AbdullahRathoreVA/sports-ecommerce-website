import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal, safe Markdown → React renderer.
 *
 * Supports exactly what our guides and the assistant use: ## / ### headings,
 * paragraphs, - and 1. lists, pipe tables, **bold**, *italic* and [links](…).
 * Produces React elements only — never dangerouslySetInnerHTML — so neither
 * admin-authored posts nor model output can inject markup or scripts.
 * Links are limited to site-relative paths and http(s) URLs.
 */

function inline(text: string, keyBase: string, dark: boolean): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyBase}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("*")) out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    else {
      const [, label, href] = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(tok)!;
      const cls = cn("font-semibold underline underline-offset-4", dark ? "text-accent hover:text-white" : "text-accent hover:text-accent-hover");
      if (href!.startsWith("/")) out.push(<Link key={key} href={href!} className={cls}>{label}</Link>);
      else if (/^https?:\/\//.test(href!)) out.push(<a key={key} href={href} rel="noopener nofollow" target="_blank" className={cls}>{label}</a>);
      else out.push(label);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source, className, dark = false, compact = false }: { source: string; className?: string; dark?: boolean; compact?: boolean }) {
  const lines = String(source ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;
  const muted = dark ? "text-white/75" : "text-muted";

  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(<h3 key={k++} className={cn("font-semibold", compact ? "mt-3 text-[15px]" : "mt-8 text-xl")}>{inline(line.slice(4), `h${k}`, dark)}</h3>);
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(<h2 key={k++} className={cn("font-semibold tracking-tight", compact ? "mt-3 text-base" : "mt-12 text-2xl sm:text-[28px]")}>{inline(line.slice(3), `h${k}`, dark)}</h2>);
      i++;
      continue;
    }
    if (line.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.trim().startsWith("|")) {
        const cells = lines[i]!.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      blocks.push(
        <div key={k++} className="my-6 overflow-x-auto rounded-xl border hairline">
          <table className="w-full min-w-[480px] border-collapse text-left text-[14px]">
            {head && (
              <thead className={dark ? "bg-white/5" : "bg-chalk"}>
                <tr>{head.map((c, j) => <th key={j} className="px-4 py-3 font-semibold">{inline(c, `th${k}${j}`, dark)}</th>)}</tr>
              </thead>
            )}
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri} className="border-t hairline">
                  {r.map((c, j) => <td key={j} className={cn("px-4 py-3 align-top", muted)}>{inline(c, `td${k}${ri}${j}`, dark)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^\s*[-*] /.test(line) || /^\s*\d+\. /.test(line)) {
      const ordered = /^\s*\d+\. /.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+\. /.test(lines[i]!) : /^\s*[-*] /.test(lines[i]!))) {
        items.push(lines[i]!.replace(/^\s*([-*]|\d+\.) /, ""));
        i++;
      }
      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag key={k++} className={cn(compact ? "my-2 space-y-1 pl-5" : "my-5 space-y-2 pl-6", ordered ? "list-decimal" : "list-disc", muted, "marker:text-accent")}>
          {items.map((it, j) => <li key={j} className="pl-1">{inline(it, `li${k}${j}`, dark)}</li>)}
        </ListTag>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(#{2,3} |\s*[-*] |\s*\d+\. |\s*\|)/.test(lines[i]!)) {
      para.push(lines[i]!);
      i++;
    }
    blocks.push(
      <p key={k++} className={cn(compact ? "my-1.5" : "my-5 text-[17px] leading-[1.75]", muted)}>
        {para.map((p, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {inline(p, `p${k}${j}`, dark)}
          </Fragment>
        ))}
      </p>,
    );
  }
  return <div className={className}>{blocks}</div>;
}
