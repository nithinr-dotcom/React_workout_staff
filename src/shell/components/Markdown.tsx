import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import s from '../shell.module.css';

/*
 * Raw HTML is not rendered, with one exception: a single-line
 * `<details><summary>Title</summary>Body</details>` becomes a collapsed
 * disclosure. Tasks use it for hints the user reveals one at a time.
 */
const DETAILS = /^<details><summary>(.*?)<\/summary>(.*?)<\/details>\s*$/gm;

const inlineHtmlToMarkdown = (html: string) => html.replace(/<code>(.*?)<\/code>/g, '`$1`').replace(/<\/?(b|strong)>/g, '**');

export function Markdown({ children }: { children: string }) {
  const parts: { kind: 'md' | 'details'; text: string; summary?: string }[] = [];
  let last = 0;
  for (const match of children.matchAll(DETAILS)) {
    parts.push({ kind: 'md', text: children.slice(last, match.index) });
    parts.push({ kind: 'details', summary: match[1], text: inlineHtmlToMarkdown(match[2]) });
    last = match.index + match[0].length;
  }
  parts.push({ kind: 'md', text: children.slice(last) });

  return (
    <div className={s.markdown}>
      {parts.map((part, i) =>
        part.kind === 'details' ? (
          <details key={i}>
            <summary>{part.summary}</summary>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
          </details>
        ) : (
          part.text.trim() && (
            <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>
              {part.text}
            </ReactMarkdown>
          )
        ),
      )}
    </div>
  );
}
