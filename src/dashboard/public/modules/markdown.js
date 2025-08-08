import { escapeHtml } from './utils.js';
import { updateHighlightTheme } from './theme.js';

export function renderMarkdown(content) {
  if (!content) return '';
  if (typeof window.markdownit === 'undefined') {
    return escapeHtml(content);
  }
  try {
    if (typeof content !== 'string') {
      content = String(content);
    }
    const md = window.markdownit({ html: true, breaks: true, linkify: true, typographer: true });
    return md.render(content);
  } catch {
    return escapeHtml(content);
  }
}

export function renderMarkdownContent(app, content) {
  if (content == null) return '';
  if (typeof window.markdownit === 'undefined') {
    return escapeHtml('' + content);
  }
  try {
    if (typeof content !== 'string') return escapeHtml(String(content));
    if (typeof hljs !== 'undefined') {
      updateHighlightTheme();
    }
    const md = window.markdownit({
      html: true,
      breaks: true,
      linkify: true,
      typographer: true,
      langPrefix: 'language-',
      highlight: function (code, lang) {
        if (lang === 'mermaid') {
          const mermaidId = 'mermaid-' + Math.random().toString(36).substr(2, 9);
          return `<div class="mermaid" id="${mermaidId}">${code}</div>`;
        }
        if (typeof hljs !== 'undefined' && lang) {
          try {
            return `<pre class="hljs-code-block"><code class="hljs language-${lang}">` +
                   hljs.highlight(code, { language: lang }).value +
                   '</code></pre>';
          } catch {
            try {
              return `<pre class="hljs-code-block"><code class="hljs">` +
                     hljs.highlightAuto(code).value +
                     '</code></pre>';
            } catch {
              return `<pre class="hljs-code-block"><code class="language-${lang}">` +
                     md.utils.escapeHtml(code) +
                     '</code></pre>';
            }
          }
        }
        return `<pre class="hljs-code-block"><code class="language-${lang || 'text'}">` +
               md.utils.escapeHtml(code) +
               '</code></pre>';
      }
    });
    const html = md.render(content);
    setTimeout(() => initializeRenderedContent(), 100);
    return html;
  } catch {
    return escapeHtml(String(content));
  }
}

export function initializeRenderedContent() {
  if (typeof mermaid !== 'undefined') {
    mermaid.initialize({
      startOnLoad: false,
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
    });
    mermaid.run();
  }
  if (typeof hljs !== 'undefined') {
    document.querySelectorAll('pre code:not(.hljs)').forEach((block) => {
      hljs.highlightElement(block);
    });
  }
}


