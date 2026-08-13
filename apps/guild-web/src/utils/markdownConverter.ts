export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineMarkdownToHtml(text: string): string {
  if (!text) return '';

  let html = escapeHtml(text);

  // 1. Workspace cards: [Task: Title](/chat?task=123)
  const cardRegex = /\[(Task|Goal|Request):\s*([^\]]+)\]\(([^)]+)\)/gi;
  html = html.replace(cardRegex, (match, type, title, url) => {
    const idMatch = url.match(/(task|goal|request)=([^&]+)/i);
    const id = idMatch ? idMatch[2] : '';
    const normalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    return `<a data-workspace-card="" data-type="${normalizedType}" data-id="${id}" data-title="${title}" href="${url}">${normalizedType}: ${title}</a>`;
  });

  // 2. Standard links: [Label](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  html = html.replace(linkRegex, '<a href="$2">$1</a>');

  // 3. Bold: **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 4. Italic: *text*
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 5. Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  return html;
}

export function markdownToHtml(markdown: string | null | undefined): string {
  if (!markdown) return '';

  const lines = markdown.split('\n');
  const htmlBlocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Code block
    if (line.trim().startsWith('```')) {
      const lang = line.replace('```', '').trim();
      let code = '';
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code += lines[i] + '\n';
        i++;
      }
      i++; // skip closing ```
      code = code.replace(/\n$/, '');
      htmlBlocks.push(`<pre><code class="language-${lang || 'plaintext'}">${escapeHtml(code)}</code></pre>`);
      continue;
    }

    // 2. Table block
    if (line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }

      const rows = tableLines.map(row => 
        row.split('|')
          .map(cell => cell.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
      ).filter(row => row.length > 0);

      if (rows.length > 0) {
        let tableHtml = '<table>';
        const hasSeparator = rows[1] && rows[1].every(cell => /^:-*-*:?|^-+$/.test(cell));
        const headers = rows[0];
        const dataRows = hasSeparator ? rows.slice(2) : rows.slice(1);

        tableHtml += '<thead><tr>';
        headers.forEach(h => {
          tableHtml += `<th>${inlineMarkdownToHtml(h)}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';

        dataRows.forEach(row => {
          tableHtml += '<tr>';
          row.forEach(cell => {
            tableHtml += `<td>${inlineMarkdownToHtml(cell)}</td>`;
          });
          tableHtml += '</tr>';
        });

        tableHtml += '</tbody></table>';
        htmlBlocks.push(tableHtml);
      }
      continue;
    }

    // 3. Callout block
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i]);
        i++;
      }

      const firstLine = quoteLines[0].trim();
      const typeMatch = firstLine.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING)\]/i);
      let calloutType = '';
      let cleanLines = quoteLines;

      if (typeMatch) {
        calloutType = typeMatch[1].toLowerCase();
        cleanLines = quoteLines.slice(1);
      }

      const bodyText = cleanLines.map(l => l.replace(/^>\s?/, '')).join('\n');
      const innerHtml = inlineMarkdownToHtml(bodyText).replace(/\n/g, '<br>');

      if (calloutType) {
        htmlBlocks.push(`<blockquote data-type="callout" data-callout-type="${calloutType}"><p>${innerHtml}</p></blockquote>`);
      } else {
        htmlBlocks.push(`<blockquote><p>${innerHtml}</p></blockquote>`);
      }
      continue;
    }

    // 4. Checklist/Tasklist Block
    const matchChecklist = line.match(/^(\s*-\s*\[([ x])\]\s*)(.*)$/i);
    if (matchChecklist) {
      let checklistHtml = '<ul data-type="taskList">';
      while (i < lines.length) {
        const itemLine = lines[i];
        const itemMatch = itemLine.match(/^(\s*[-\*]\s*\[([ x])\]\s*)(.*)$/i);
        if (!itemMatch) break;

        const checked = itemMatch[2].toLowerCase() === 'x';
        const text = itemMatch[3];
        checklistHtml += `<li data-type="taskItem" data-checked="${checked}">${inlineMarkdownToHtml(text)}</li>`;
        i++;
      }
      checklistHtml += '</ul>';
      htmlBlocks.push(checklistHtml);
      continue;
    }

    // 5. Bullet list Block
    const matchBullet = line.match(/^(\s*[-\*]\s*)(.*)$/);
    if (matchBullet) {
      let listHtml = '<ul>';
      while (i < lines.length) {
        const itemLine = lines[i];
        if (itemLine.match(/^(\s*[-\*]\s*\[[ x]\]\s*)/i)) break;
        
        const itemMatch = itemLine.match(/^(\s*[-\*]\s*)(.*)$/);
        if (!itemMatch) break;

        const text = itemMatch[2];
        listHtml += `<li>${inlineMarkdownToHtml(text)}</li>`;
        i++;
      }
      listHtml += '</ul>';
      htmlBlocks.push(listHtml);
      continue;
    }

    // 6. Ordered list Block
    const matchNumbered = line.match(/^(\s*\d+\.\s*)(.*)$/);
    if (matchNumbered) {
      let listHtml = '<ol>';
      while (i < lines.length) {
        const itemLine = lines[i];
        const itemMatch = itemLine.match(/^(\s*\d+\.\s*)(.*)$/);
        if (!itemMatch) break;

        const text = itemMatch[2];
        listHtml += `<li>${inlineMarkdownToHtml(text)}</li>`;
        i++;
      }
      listHtml += '</ol>';
      htmlBlocks.push(listHtml);
      continue;
    }

    // 7. Headers
    const matchHeader = line.match(/^(#{1,6})\s+(.*)$/);
    if (matchHeader) {
      const level = matchHeader[1].length;
      const text = matchHeader[2];
      htmlBlocks.push(`<h${level}>${inlineMarkdownToHtml(text)}</h${level}>`);
      i++;
      continue;
    }

    // 8. Paragraph / Empty space
    if (line.trim() === '') {
      htmlBlocks.push('<p></p>');
      i++;
      continue;
    }

    htmlBlocks.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
    i++;
  }

  return htmlBlocks.join('\n');
}

export function htmlToMarkdown(html: string | null | undefined): string {
  if (!html) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const markdownBlocks: string[] = [];

  const children = Array.from(doc.body.childNodes);
  children.forEach(node => {
    const blockMd = processBlockNode(node);
    if (blockMd) {
      markdownBlocks.push(blockMd);
    }
  });

  return markdownBlocks.join('\n\n');
}

function processBlockNode(node: Node): string {
  if (node.nodeType !== 1) {
    const text = node.textContent?.trim();
    return text ? text : '';
  }

  const el = node as HTMLElement;
  const tagName = el.tagName.toUpperCase();

  // Headers
  if (/^H[1-6]$/.test(tagName)) {
    const level = parseInt(tagName.charAt(1), 10);
    const hashes = '#'.repeat(level);
    return `${hashes} ${processInlineNodes(el)}`;
  }

  // Paragraphs
  if (tagName === 'P') {
    return processInlineNodes(el);
  }

  // Pre / Code blocks
  if (tagName === 'PRE') {
    const codeEl = el.querySelector('code');
    const codeText = codeEl ? codeEl.textContent || '' : el.textContent || '';
    let lang = 'plaintext';
    if (codeEl) {
      const classList = Array.from(codeEl.classList);
      const langClass = classList.find(c => c.startsWith('language-'));
      if (langClass) {
        lang = langClass.replace('language-', '');
      }
    }
    return `\`\`\`${lang}\n${codeText}\n\`\`\``;
  }

  // Blockquotes (Callouts or quotes)
  if (tagName === 'BLOCKQUOTE') {
    const isCallout = el.getAttribute('data-type') === 'callout';
    const calloutType = el.getAttribute('data-callout-type');
    const innerText = processInlineNodes(el);
    const lines = innerText.split('\n');

    if (isCallout && calloutType) {
      const typeUpper = calloutType.toUpperCase();
      const body = lines.map(line => `> ${line}`).join('\n');
      return `> [!${typeUpper}]\n${body}`;
    } else {
      return lines.map(line => `> ${line}`).join('\n');
    }
  }

  // Lists
  if (tagName === 'UL') {
    const isTaskList = el.getAttribute('data-type') === 'taskList';
    const items = Array.from(el.querySelectorAll(':scope > li'));
    const listLines = items.map(li => {
      const liEl = li as HTMLElement;
      const text = processInlineNodes(liEl);
      if (isTaskList) {
        const checked = liEl.getAttribute('data-checked') === 'true' || liEl.classList.contains('is-checked');
        return `- [${checked ? 'x' : ' '}] ${text}`;
      } else {
        return `- ${text}`;
      }
    });
    return listLines.join('\n');
  }

  if (tagName === 'OL') {
    const items = Array.from(el.querySelectorAll(':scope > li'));
    const listLines = items.map((li, idx) => {
      const text = processInlineNodes(li as HTMLElement);
      return `${idx + 1}. ${text}`;
    });
    return listLines.join('\n');
  }

  // Tables
  if (tagName === 'TABLE') {
    const rows = Array.from(el.querySelectorAll('tr'));
    if (rows.length === 0) return '';

    const mdRows: string[] = [];
    let colCount = 0;

    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      if (rowIndex === 0) {
        colCount = cells.length;
      }
      const cellTexts = cells.map(cell => processInlineNodes(cell as HTMLElement).replace(/\|/g, '\\|'));
      mdRows.push(`| ${cellTexts.join(' | ')} |`);

      if (rowIndex === 0) {
        const separator = Array(colCount).fill('---');
        mdRows.push(`| ${separator.join(' | ')} |`);
      }
    });

    return mdRows.join('\n');
  }

  return processInlineNodes(el);
}

function processInlineNodes(node: HTMLElement): string {
  let text = '';
  const childNodes = Array.from(node.childNodes);

  childNodes.forEach(child => {
    if (child.nodeType === 3) {
      text += child.textContent;
    } else if (child.nodeType === 1) {
      const childEl = child as HTMLElement;
      const childTag = childEl.tagName.toUpperCase();

      if (childTag === 'STRONG' || childTag === 'B') {
        text += `**${processInlineNodes(childEl)}**`;
      } else if (childTag === 'EM' || childTag === 'I') {
        text += `*${processInlineNodes(childEl)}*`;
      } else if (childTag === 'CODE') {
        text += `\`${childEl.textContent}\``;
      } else if (childTag === 'BR') {
        text += '\n';
      } else if (childTag === 'A') {
        const isCard = childEl.hasAttribute('data-workspace-card');
        if (isCard) {
          const type = childEl.getAttribute('data-type') || 'Task';
          const id = childEl.getAttribute('data-id') || '';
          const title = childEl.getAttribute('data-title') || childEl.textContent || '';
          text += `[${type}: ${title}](/chat?${type.toLowerCase()}=${id})`;
        } else {
          const href = childEl.getAttribute('href') || '';
          const label = processInlineNodes(childEl);
          text += `[${label}](${href})`;
        }
      } else {
        text += processInlineNodes(childEl);
      }
    }
  });

  return text;
}
