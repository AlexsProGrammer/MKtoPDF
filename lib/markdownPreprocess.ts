/**
 * Pre-processes raw markdown to handle ==highlight== and worksheet syntax.
 * Converts ==text== to <mark>text</mark> before parsing.
 * Converts :::space[N]:::, :::lines[N]:::, :::grid[N]::: to HTML divs.
 * Consecutive same-type worksheet lines (no blank line between) are merged.
 *
 * This file is intentionally kept free of DOM dependencies (no mermaid, katex, DOMPurify)
 * so it can safely be imported in Web Worker environments.
 *
 * @param markdown Raw markdown string
 * @returns Preprocessed markdown
 */
type WsType = 'space' | 'lines' | 'grid';

export function preprocessMarkdown(markdown: string): string {
  const lines = markdown.split('\n');
  let inFence = false;
  let fenceChar: '`' | '~' | null = null;
  let fenceLen = 0;

  const output: string[] = [];
  let pendingWs: { type: WsType; n: number } | null = null;

  const flushPending = () => {
    if (!pendingWs) return;
    output.push(buildWorksheetHtml(pendingWs.type, pendingWs.n));
    pendingWs = null;
  };

  for (const line of lines) {
    // Fenced code blocks: ``` or ~~~ (up to 3 leading spaces)
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      const markerChar = marker[0] as '`' | '~';

      if (!inFence) {
        inFence = true;
        fenceChar = markerChar;
        fenceLen = marker.length;
      } else if (markerChar === fenceChar && marker.length >= fenceLen) {
        inFence = false;
        fenceChar = null;
        fenceLen = 0;
      }

      flushPending();
      output.push(line);
      continue;
    }

    // Keep everything inside fenced blocks unchanged.
    if (inFence) {
      output.push(line);
      continue;
    }

    // Indented code blocks (4 spaces or a tab).
    if (/^(?:\t| {4})/.test(line)) {
      flushPending();
      output.push(line);
      continue;
    }

    // Worksheet elements: :::space[N]:::, :::lines[N]:::, :::grid[N]:::
    const wsMatch = line.match(/^:::(space|lines|grid)\[(\d+)\]:::$/);
    if (wsMatch) {
      const type = wsMatch[1] as WsType;
      const n = Math.max(1, Math.min(200, parseInt(wsMatch[2], 10)));

      if (pendingWs && pendingWs.type === type) {
        // Same type, no blank line between → merge
        pendingWs.n += n;
      } else {
        flushPending();
        pendingWs = { type, n };
      }
      continue;
    }

    // Blank line: flush pending (creates separation), then pass through
    if (line.trim() === '') {
      flushPending();
      output.push(line);
      continue;
    }

    // Regular line: flush any pending worksheet element, then process highlights
    flushPending();
    output.push(replaceHighlightsOutsideInlineCode(line));
  }

  flushPending();

  return output.join('\n');
}

function buildWorksheetHtml(type: WsType, n: number): string {
  const shared = 'width:100%; box-sizing:border-box; display:block; break-inside:avoid; page-break-inside:avoid;';

  if (type === 'space') {
    return (
      `<div class="md-ws-space" style="${shared} ` +
      `height:calc(${n} * var(--ws-line-height, 7mm)); ` +
      `border-width:1px; ` +
      `border-color:var(--ws-border-color, #bbbbbb); ` +
      `border-style:var(--ws-space-border-style, dashed);"></div>`
    );
  }

  if (type === 'lines') {
    // Use N stacked border-bottom divs instead of background-image gradients.
    // Borders always print reliably; background gradients can be dropped by the
    // browser's print renderer due to mm/px DPI scaling and "print backgrounds"
    // settings. Each row gets border-bottom except the last (avoids double border
    // with the outer container).
    const lineStyle = `height:var(--ws-line-height, 7mm); box-sizing:border-box; border-bottom:1px solid var(--ws-line-color, #aaaaaa);`;
    const lastStyle = `height:var(--ws-line-height, 7mm); box-sizing:border-box;`;
    const rows = Array.from({ length: n }, (_, i) =>
      `<div style="${i === n - 1 ? lastStyle : lineStyle}"></div>`
    ).join('');
    return (
      `<div class="md-ws-lines" style="${shared} ` +
      `border:1px solid var(--ws-border-color, #bbbbbb); ` +
      `background-color:#ffffff;">${rows}</div>`
    );
  }

  // grid (Karo-Muster): horizontal lines via border-bottom (always prints),
  // vertical lines via background-image in X direction only (background-size width=mm,
  // height=100% of each row — no mm/px cross-axis math, safe for print).
  const gridRowStyle =
    `height:var(--ws-grid-size, 5mm); box-sizing:border-box; ` +
    `border-bottom:1px solid var(--ws-grid-color, #cccccc); ` +
    `background-image:linear-gradient(to right, var(--ws-grid-color, #cccccc) 0, var(--ws-grid-color, #cccccc) 1px, transparent 1px); ` +
    `background-size:var(--ws-grid-size, 5mm) 100%; background-repeat:repeat-x;`;
  const gridLastStyle =
    `height:var(--ws-grid-size, 5mm); box-sizing:border-box; ` +
    `background-image:linear-gradient(to right, var(--ws-grid-color, #cccccc) 0, var(--ws-grid-color, #cccccc) 1px, transparent 1px); ` +
    `background-size:var(--ws-grid-size, 5mm) 100%; background-repeat:repeat-x;`;
  const gridRows = Array.from({ length: n }, (_, i) =>
    `<div style="${i === n - 1 ? gridLastStyle : gridRowStyle}"></div>`
  ).join('');
  return (
    `<div class="md-ws-grid" style="${shared} ` +
    `border:1px solid var(--ws-border-color, #bbbbbb); ` +
    `background-color:#ffffff;">${gridRows}</div>`
  );
}


function replaceHighlightsOutsideInlineCode(line: string): string {
  const transformHighlights = (text: string) => text.replace(/==((?:[^=]|=[^=])+?)==/g, '<mark>$1</mark>');

  let result = '';
  let textSegment = '';
  let i = 0;

  while (i < line.length) {
    if (line[i] !== '`') {
      textSegment += line[i];
      i += 1;
      continue;
    }

    // Flush plain text and transform highlights there only.
    result += transformHighlights(textSegment);
    textSegment = '';

    const start = i;
    let ticks = 0;
    while (i < line.length && line[i] === '`') {
      ticks += 1;
      i += 1;
    }

    const fence = '`'.repeat(ticks);
    const closeIdx = line.indexOf(fence, i);

    if (closeIdx === -1) {
      // Unclosed backticks: keep as-is and stop processing this line.
      result += line.slice(start);
      return result;
    }

    result += line.slice(start, closeIdx + ticks);
    i = closeIdx + ticks;
  }

  result += transformHighlights(textSegment);
  return result;
}
