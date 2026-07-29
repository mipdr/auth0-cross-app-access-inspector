import React from 'react';
import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/github-dark.css';

hljs.registerLanguage('xml', xml);

// Lightweight pretty-printer for the (usually single-line) SAML assertion XML.
const formatXml = (input: string): string => {
  const withBreaks = input.replace(/>\s*</g, '>\n<');
  let indent = 0;
  return withBreaks
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (/^<\/.+>/.test(trimmed)) indent = Math.max(indent - 1, 0);
      const padded = `${'  '.repeat(indent)}${trimmed}`;
      if (
        /^<[^!?/][^>]*[^/]>$/.test(trimmed) &&
        !/^<[^>]+>.*<\/[^>]+>$/.test(trimmed)
      ) {
        indent += 1;
      }
      return padded;
    })
    .filter(Boolean)
    .join('\n');
};

interface XmlViewerProps {
  xml: string;
  title?: string;
}

export const XmlViewer: React.FC<XmlViewerProps> = ({ xml: content, title }) => {
  const formatted = formatXml(content);
  const highlighted = hljs.highlight(formatted, { language: 'xml' }).value;

  return (
    <div className="mt-4">
      {title && (
        <h4 className="text-sm font-medium text-gray-700 mb-2">{title}</h4>
      )}
      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto max-h-96">
        <pre className="text-sm font-mono whitespace-pre-wrap break-all">
          <code
            className="language-xml hljs"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      </div>
    </div>
  );
};
