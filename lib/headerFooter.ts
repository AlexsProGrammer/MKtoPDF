import { StyleSettings } from './styleSettings';

export const HEADER_FOOTER_COLOR = '#64748b';

interface PageRuleOptions {
  marginMm?: number;
  marginFontSizePt?: number;
  docName?: string;
}

const SUPPORTED_COMMANDS = 'date|currentDate|page|pages|currentPage|totalPages|maxPages|time|year|doc_name|docName';

// Matches both {{ command }} and { command } syntax (whitespace-tolerant)
const COMMAND_REGEX = new RegExp(
  `\\{\\{\\s*(?:${SUPPORTED_COMMANDS})\\s*\\}\\}|\\{\\s*(?:${SUPPORTED_COMMANDS})\\s*\\}`,
  'gi'
);

type ContentToken =
  | { type: 'text'; value: string }
  | { type: 'page' }
  | { type: 'pages' };

function escapeCssString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r\n|\r|\n/g, '\\A ');
}

function normalizeCommand(raw: string, docName?: string): ContentToken {
  const keyword = raw.replace(/[{}\s]/g, '').toLowerCase();

  if (keyword === 'page' || keyword === 'currentpage') {
    return { type: 'page' };
  }
  if (keyword === 'pages' || keyword === 'totalpages' || keyword === 'maxpages') {
    return { type: 'pages' };
  }
  if (keyword === 'time') {
    return {
      type: 'text',
      value: new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()),
    };
  }
  if (keyword === 'year') {
    return { type: 'text', value: String(new Date().getFullYear()) };
  }
  if (keyword === 'doc_name' || keyword === 'docname') {
    return { type: 'text', value: docName ?? '' };
  }
  // date / currentDate
  return {
    type: 'text',
    value: new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date()),
  };
}

function mergeTextTokens(tokens: ContentToken[]): ContentToken[] {
  return tokens.reduce<ContentToken[]>((merged, token) => {
    if (token.type !== 'text') {
      merged.push(token);
      return merged;
    }

    const previous = merged[merged.length - 1];
    if (previous?.type === 'text') {
      previous.value += token.value;
      return merged;
    }

    merged.push({ ...token });
    return merged;
  }, []);
}

export function formatMarginContent(input: string, docName?: string): string {
  if (!input.trim()) {
    return '""';
  }

  const tokens: ContentToken[] = [];
  let cursor = 0;

  for (const match of input.matchAll(COMMAND_REGEX)) {
    const [raw] = match;
    const start = match.index ?? 0;

    if (start > cursor) {
      tokens.push({ type: 'text', value: input.slice(cursor, start) });
    }

    tokens.push(normalizeCommand(raw, docName));
    cursor = start + raw.length;
  }

  if (cursor < input.length) {
    tokens.push({ type: 'text', value: input.slice(cursor) });
  }

  return mergeTextTokens(tokens)
    .map((token) => {
      if (token.type === 'page') return 'counter(page)';
      if (token.type === 'pages') return 'counter(pages)';
      return `"${escapeCssString(token.value)}"`;
    })
    .join(' ');
}

export function hasCustomHeaderFooter(settings: StyleSettings): boolean {
  return [
    settings.headerLeft,
    settings.headerCenter,
    settings.headerRight,
    settings.footerLeft,
    settings.footerCenter,
    settings.footerRight,
  ].some((value) => value.trim().length > 0);
}

export function buildPageRules(
  settings: StyleSettings,
  orientation: 'portrait' | 'landscape',
  options: PageRuleOptions = {}
): string {
  const marginMm = options.marginMm ?? 20;
  const marginFontSizePt = options.marginFontSizePt ?? 9;
  const color = settings.headerFooterColor || HEADER_FOOTER_COLOR;
  const { docName } = options;

  const headerLeft   = formatMarginContent(settings.headerLeft,   docName);
  const headerCenter = formatMarginContent(settings.headerCenter, docName);
  const headerRight  = formatMarginContent(settings.headerRight,  docName);
  const footerLeft   = formatMarginContent(settings.footerLeft,   docName);
  const footerCenter = formatMarginContent(settings.footerCenter, docName);
  const footerRight  = formatMarginContent(settings.footerRight,  docName);

  return `
    @page {
      size: A4 ${orientation};
      margin: ${marginMm}mm;

      @top-left { content: ${headerLeft}; font-family: var(--md-font-family); font-size: ${marginFontSizePt}pt; color: ${color}; }
      @top-center { content: ${headerCenter}; font-family: var(--md-font-family); font-size: ${marginFontSizePt}pt; color: ${color}; }
      @top-right { content: ${headerRight}; font-family: var(--md-font-family); font-size: ${marginFontSizePt}pt; color: ${color}; }

      @bottom-left { content: ${footerLeft}; font-family: var(--md-font-family); font-size: ${marginFontSizePt}pt; color: ${color}; }
      @bottom-center { content: ${footerCenter}; font-family: var(--md-font-family); font-size: ${marginFontSizePt}pt; color: ${color}; }
      @bottom-right { content: ${footerRight}; font-family: var(--md-font-family); font-size: ${marginFontSizePt}pt; color: ${color}; }
    }
  `;
}