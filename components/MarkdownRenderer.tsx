import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-invert prose-indigo max-w-none 
      prose-headings:text-slate-100 prose-headings:font-bold
      prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h3:text-indigo-400
      prose-p:text-slate-300 prose-p:leading-relaxed
      prose-strong:text-indigo-300 prose-strong:font-bold
      prose-ul:my-4 prose-li:my-1
      prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-slate-900/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:text-slate-400 prose-blockquote:not-italic
      prose-table:w-full prose-table:border-collapse prose-table:my-6
      prose-thead:bg-slate-900
      prose-th:p-4 prose-th:text-left prose-th:text-sm prose-th:font-semibold prose-th:text-indigo-400 prose-th:border-b prose-th:border-slate-700
      prose-td:p-4 prose-td:text-sm prose-td:text-slate-300 prose-td:border-b prose-td:border-slate-800
      prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-pre:rounded-xl
      prose-hr:border-slate-800
    ">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({node, ...props}) => (
            <div className="overflow-x-auto rounded-lg border border-slate-800 shadow-sm my-6">
              <table {...props} className="w-full text-left border-collapse" />
            </div>
          ),
          a: ({node, ...props}) => (
            <a {...props} className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4" target="_blank" rel="noopener noreferrer" />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;