/**
 * Clean HTML <-> Markdown utilities for Canvas document exports and template loading.
 */

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Converts inline markdown tags into HTML
 */
export function inlineMarkdownToHtml(text: string): string {
  if (!text) return '';

  let html = escapeHtml(text);

  // 1. Standard markdown links: [Label](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // 2. Bold: **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 3. Highlight: ==text==
  html = html.replace(/==([^=]+)==/g, '<mark>$1</mark>');

  // 4. Italic: *text* or _text_
  html = html.replace(/(?:^|[^*])\*([^*]+)\*/g, (match, p1) => match.startsWith('*') ? `<em>${p1}</em>` : `${match[0]}<em>${p1}</em>`);

  // 5. Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  return html;
}

/**
 * Converts Markdown templates or raw markdown strings into clean TipTap HTML.
 */
export function templateToHtml(markdown: string | null | undefined): string {
  if (!markdown || !markdown.trim()) return '<p></p>';

  const lines = markdown.split('\n');
  const htmlBlocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.trim().startsWith('```')) {
      const lang = line.replace('```', '').trim();
      let code = '';
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code += lines[i] + '\n';
        i++;
      }
      i++; // Skip closing ```
      code = code.replace(/\n$/, '');
      htmlBlocks.push(`<pre><code class="language-${lang || 'plaintext'}">${escapeHtml(code)}</code></pre>`);
      continue;
    }

    // Callout / Blockquote
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i]);
        i++;
      }
      const rawText = quoteLines.map(l => l.replace(/^>\s?/, '')).join('<br>');
      htmlBlocks.push(`<blockquote><p>${inlineMarkdownToHtml(rawText)}</p></blockquote>`);
      continue;
    }

    // Task List / Checklist
    if (/^\s*-\s*\[([ xX])\]\s*/.test(line)) {
      let checklistHtml = '<ul data-type="taskList">';
      while (i < lines.length) {
        const itemMatch = lines[i].match(/^\s*-\s*\[([ xX])\]\s*(.*)$/);
        if (!itemMatch) break;
        const checked = itemMatch[1].toLowerCase() === 'x';
        const content = itemMatch[2];
        checklistHtml += `<li data-type="taskItem" data-checked="${checked}"><label><input type="checkbox" ${checked ? 'checked' : ''}><span></span></label><div><p>${inlineMarkdownToHtml(content)}</p></div></li>`;
        i++;
      }
      checklistHtml += '</ul>';
      htmlBlocks.push(checklistHtml);
      continue;
    }

    // Unordered Bullet List
    if (/^\s*[-\*]\s+/.test(line)) {
      let listHtml = '<ul>';
      while (i < lines.length) {
        if (/^\s*[-\*]\s*\[[ xX]\]\s*/.test(lines[i])) break;
        const itemMatch = lines[i].match(/^\s*[-\*]\s+(.*)$/);
        if (!itemMatch) break;
        listHtml += `<li><p>${inlineMarkdownToHtml(itemMatch[1])}</p></li>`;
        i++;
      }
      listHtml += '</ul>';
      htmlBlocks.push(listHtml);
      continue;
    }

    // Ordered Numbered List
    if (/^\s*\d+\.\s+/.test(line)) {
      let listHtml = '<ol>';
      while (i < lines.length) {
        const itemMatch = lines[i].match(/^\s*\d+\.\s+(.*)$/);
        if (!itemMatch) break;
        listHtml += `<li><p>${inlineMarkdownToHtml(itemMatch[1])}</p></li>`;
        i++;
      }
      listHtml += '</ol>';
      htmlBlocks.push(listHtml);
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      htmlBlocks.push(`<h${level}>${inlineMarkdownToHtml(headingText)}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal Rule
    if (/^(\*\*\*|---|___)$/.test(line.trim())) {
      htmlBlocks.push('<hr>');
      i++;
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Standard Paragraph
    htmlBlocks.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
    i++;
  }

  return htmlBlocks.length > 0 ? htmlBlocks.join('') : '<p></p>';
}

/**
 * Converts TipTap HTML document to standard Markdown for export/copying.
 */
export function exportHtmlToMarkdown(html: string | null | undefined): string {
  if (!html) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const markdownBlocks: string[] = [];

  Array.from(doc.body.childNodes).forEach((node) => {
    const md = processBlockNode(node);
    if (md) {
      markdownBlocks.push(md);
    }
  });

  return markdownBlocks.join('\n\n');
}

function processBlockNode(node: Node): string {
  if (node.nodeType === 3) {
    return node.textContent?.trim() || '';
  }
  if (node.nodeType !== 1) return '';

  const el = node as HTMLElement;
  const tag = el.tagName.toUpperCase();

  if (/^H[1-6]$/.test(tag)) {
    const level = parseInt(tag.charAt(1), 10);
    return `${'#'.repeat(level)} ${processInlineContent(el)}`;
  }

  if (tag === 'P') {
    return processInlineContent(el);
  }

  if (tag === 'PRE') {
    const codeEl = el.querySelector('code');
    const codeText = codeEl ? codeEl.textContent || '' : el.textContent || '';
    let lang = '';
    if (codeEl) {
      const match = Array.from(codeEl.classList).find(c => c.startsWith('language-'));
      if (match) lang = match.replace('language-', '');
    }
    return `\`\`\`${lang}\n${codeText}\n\`\`\``;
  }

  if (tag === 'BLOCKQUOTE') {
    const text = processInlineContent(el);
    return text.split('\n').map(l => `> ${l}`).join('\n');
  }

  if (tag === 'HR') {
    return '---';
  }

  if (tag === 'UL') {
    const isTaskList = el.getAttribute('data-type') === 'taskList';
    const items = Array.from(el.querySelectorAll(':scope > li'));
    return items.map((li) => {
      const liEl = li as HTMLElement;
      const isTask = liEl.getAttribute('data-type') === 'taskItem' || isTaskList;
      const checked = liEl.getAttribute('data-checked') === 'true' || liEl.querySelector('input[type="checkbox"]:checked') !== null;
      const text = processInlineContent(liEl);
      if (isTask) {
        return `- [${checked ? 'x' : ' '}] ${text}`;
      }
      return `- ${text}`;
    }).join('\n');
  }

  if (tag === 'OL') {
    const items = Array.from(el.querySelectorAll(':scope > li'));
    return items.map((li, idx) => {
      const text = processInlineContent(li as HTMLElement);
      return `${idx + 1}. ${text}`;
    }).join('\n');
  }

  return processInlineContent(el);
}

function processInlineContent(node: HTMLElement): string {
  let text = '';
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === 3) {
      text += child.textContent;
    } else if (child.nodeType === 1) {
      const childEl = child as HTMLElement;
      const tag = childEl.tagName.toUpperCase();

      if (tag === 'STRONG' || tag === 'B') {
        text += `**${processInlineContent(childEl)}**`;
      } else if (tag === 'EM' || tag === 'I') {
        text += `*${processInlineContent(childEl)}*`;
      } else if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') {
        text += `~~${processInlineContent(childEl)}~~`;
      } else if (tag === 'MARK') {
        text += `==${processInlineContent(childEl)}==`;
      } else if (tag === 'CODE') {
        text += `\`${childEl.textContent}\``;
      } else if (tag === 'A') {
        const href = childEl.getAttribute('href') || '';
        text += `[${processInlineContent(childEl)}](${href})`;
      } else if (tag === 'BR') {
        text += '\n';
      } else if (tag === 'LABEL' && childEl.querySelector('input[type="checkbox"]')) {
        // Skip checkbox wrapper label in task items
      } else {
        text += processInlineContent(childEl);
      }
    }
  });
  return text.trim();
}

// Backward-compatible aliases
export const markdownToHtml = templateToHtml;
export const htmlToMarkdown = exportHtmlToMarkdown;
