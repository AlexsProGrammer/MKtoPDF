export interface CustomFont {
    name: string;
    dataUrl: string;
}

/**
 * Style settings interface for the MKtoPDF preview customization.
 * All values map to CSS custom properties (--md-*).
 */
export interface StyleSettings {
    // Typography
    fontFamily: string; // 'sans' | 'serif' | 'mono' or a custom font name
    headingFontFamily: string; // 'sans' | 'serif' | 'mono' or a custom font name
    fontSize: number; // in px (14-22)
    lineHeight: number; // 1.4 - 2.0

    // Colors
    accentColor: string;
    headingColor: string;
    h1Color: string;
    h2Color: string;
    h3Color: string;
    h4Color: string;
    textColor: string;
    paragraphColor: string;
    backgroundColor: string;
    codeBgColor: string;
    codeTextColor: string;

    // Table colors
    tableBorderColor: string;
    tableHeaderBg: string;
    tableHeaderColor: string;
    tableStripeColor: string;

    // Layout
    maxContentWidth: number; // in px (600-1200)
    paragraphAlign: 'left' | 'justify';

    // Header & Footer
    headerLeft: string;
    headerCenter: string;
    headerRight: string;
    footerLeft: string;
    footerCenter: string;
    footerRight: string;
    headerFooterColor: string;

    // Custom uploaded fonts
    customFonts: CustomFont[];

    // Text extras
    linkColor: string;
    calloutTextColor: string;

    // Callout overrides (optional per-type color overrides)
    calloutColors: Partial<Record<string, string>>;
}

export const DEFAULT_STYLE_SETTINGS: StyleSettings = {
    fontFamily: 'sans',
    headingFontFamily: 'sans',
    fontSize: 16,
    lineHeight: 1.6,
    accentColor: '#4f46e5',
    headingColor: '#1e293b',
    h1Color: '',
    h2Color: '',
    h3Color: '',
    h4Color: '',
    textColor: '#334155',
    paragraphColor: '',
    backgroundColor: '#ffffff',
    codeBgColor: '#f6f8fa',
    codeTextColor: '',
    tableBorderColor: '#e2e8f0',
    tableHeaderBg: '#f1f5f9',
    tableHeaderColor: '#475569',
    tableStripeColor: '#fafbfc',
    maxContentWidth: 900,
    paragraphAlign: 'left',
    headerLeft: '',
    headerCenter: '',
    headerRight: '',
    footerLeft: '',
    footerCenter: '',
    footerRight: '',
    headerFooterColor: '#64748b',
    linkColor: '',
    calloutTextColor: '#475569',
    customFonts: [],
    calloutColors: {},
};

const FONT_FAMILIES: Record<string, string> = {
    sans: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    serif: "'Georgia', 'Times New Roman', serif",
    mono: "'Fira Code', 'JetBrains Mono', ui-monospace, monospace",
    arial: 'Arial, Helvetica, sans-serif',
    'times-new-roman': "'Times New Roman', Times, serif",
    'courier-new': "'Courier New', Courier, monospace",
    verdana: 'Verdana, Geneva, sans-serif',
};

/**
 * Resolve a font key ('sans', 'serif', 'mono', or a custom font name) to a CSS font-family value.
 */
export function resolveFontFamily(key: string, customFonts: CustomFont[] = []): string {
    if (FONT_FAMILIES[key]) return FONT_FAMILIES[key];
    // Custom font — the @font-face name is the font name itself
    const custom = customFonts.find((f) => f.name === key);
    if (custom) return `"${custom.name}", sans-serif`;
    return FONT_FAMILIES.sans;
}

/**
 * Build @font-face CSS rules for all custom fonts.
 */
export function buildFontFaceRules(customFonts: CustomFont[] | undefined): string {
    if (!customFonts?.length) return '';
    return customFonts
        .map(
            (f) =>
                `@font-face { font-family: "${f.name}"; src: url("${f.dataUrl}"); font-weight: normal; font-style: normal; }`
        )
        .join('\n');
}

/**
 * Convert StyleSettings to a record of CSS custom properties.
 */
export function stylesToCSSVars(settings: StyleSettings): Record<string, string> {
    return {
        '--md-font-family': resolveFontFamily(settings.fontFamily, settings.customFonts),
        '--md-heading-font-family': resolveFontFamily(settings.headingFontFamily, settings.customFonts),
        '--md-font-size': `${settings.fontSize}px`,
        '--md-line-height': `${settings.lineHeight}`,
        '--md-accent-color': settings.accentColor,
        '--md-heading-color': settings.headingColor,
        '--md-h1-color': settings.h1Color || settings.headingColor,
        '--md-h2-color': settings.h2Color || settings.headingColor,
        '--md-h3-color': settings.h3Color || settings.headingColor,
        '--md-h4-color': settings.h4Color || settings.headingColor,
        '--md-text-color': settings.textColor,
        '--md-p-color': settings.paragraphColor || settings.textColor,
        '--md-bg-color': settings.backgroundColor,
        '--md-code-bg': settings.codeBgColor,
        '--md-code-color': settings.codeTextColor || 'inherit',
        '--md-link-color': settings.linkColor || settings.accentColor,
        '--md-callout-text-color': settings.calloutTextColor || '#475569',
        '--md-table-border': settings.tableBorderColor || '#e2e8f0',
        '--md-table-header-bg': settings.tableHeaderBg || '#f1f5f9',
        '--md-table-header-color': settings.tableHeaderColor || '#475569',
        '--md-table-stripe-bg': settings.tableStripeColor || '#fafbfc',
        '--md-max-width': `${settings.maxContentWidth}px`,
        '--md-p-align': settings.paragraphAlign,
        '--md-header-footer-color': settings.headerFooterColor || '#64748b',
        // Header & Footer content
        '--md-header-left': `"${settings.headerLeft}"`,
        '--md-header-center': `"${settings.headerCenter}"`,
        '--md-header-right': `"${settings.headerRight}"`,
        '--md-footer-left': `"${settings.footerLeft}"`,
        '--md-footer-center': `"${settings.footerCenter}"`,
        '--md-footer-right': `"${settings.footerRight}"`,
    };
}

/**
 * Callout type definitions with default colors and icons.
 */
export const CALLOUT_TYPES: Record<string, { color: string; icon: string; aliases: string[] }> = {
    note: { color: '#448aff', icon: 'ℹ️', aliases: ['info'] },
    tip: { color: '#00bfa5', icon: '💡', aliases: ['hint'] },
    important: { color: '#7c4dff', icon: '❗', aliases: [] },
    warning: { color: '#ff9100', icon: '⚠️', aliases: ['caution', 'attention'] },
    danger: { color: '#ff1744', icon: '⛔', aliases: ['error'] },
    example: { color: '#7c4dff', icon: '📋', aliases: [] },
    quote: { color: '#9e9e9e', icon: '💬', aliases: ['cite'] },
    success: { color: '#00c853', icon: '✅', aliases: ['check', 'done'] },
    question: { color: '#ffab00', icon: '❓', aliases: ['faq', 'help'] },
    bug: { color: '#ff1744', icon: '🐛', aliases: [] },
    abstract: { color: '#00bcd4', icon: '📝', aliases: ['summary', 'tldr'] },
    todo: { color: '#448aff', icon: '📌', aliases: [] },
};

/**
 * Resolve a callout type string (including aliases) to the canonical type.
 */
export function resolveCalloutType(raw: string): string {
    const lower = raw.toLowerCase().trim();
    if (CALLOUT_TYPES[lower]) return lower;
    for (const [key, def] of Object.entries(CALLOUT_TYPES)) {
        if (def.aliases.includes(lower)) return key;
    }
    return 'note'; // fallback
}
