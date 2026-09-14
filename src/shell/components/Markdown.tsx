import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import s from '../shell.module.css';

export function Markdown({ children }: { children: string }) {
  return (
    <div className={s.markdown}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
