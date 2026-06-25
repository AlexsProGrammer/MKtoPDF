import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCcw, Palette, Type, Layout, MessageSquare, FileText, Upload, Trash2, Grid3x3 } from 'lucide-react';
import { StyleSettings, DEFAULT_STYLE_SETTINGS, CALLOUT_TYPES, CustomFont } from '../lib/styleSettings';
import clsx from 'clsx';

interface StylesModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: StyleSettings;
    onSettingsChange: (settings: StyleSettings) => void;
}

type TabId = 'typography' | 'colors' | 'callouts' | 'layout' | 'export' | 'worksheet';

const TABS: { id: TabId; label: string; icon: React.FC<any> }[] = [
    { id: 'typography', label: 'Typography', icon: Type },
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'callouts', label: 'Callouts', icon: MessageSquare },
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'export', label: 'Header & Footer', icon: FileText },
    { id: 'worksheet', label: 'Worksheet', icon: Grid3x3 },
];

const ColorInput: React.FC<{
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
    <div className="flex items-center justify-between gap-3">
        <label className="text-sm text-gray-600 font-medium">{label}</label>
        <div className="flex items-center gap-2">
            <input
                type="color"
                value={value || '#000000'}
                onChange={(e) => onChange(e.target.value)}
                className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
                style={{ padding: 0 }}
            />
            <input
                type="text"
                value={value}
                placeholder={placeholder || ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-24 px-2 py-1 text-xs font-mono bg-gray-50 border border-gray-200 rounded-md"
            />
        </div>
    </div>
);

const SliderInput: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    onChange: (v: number) => void;
}> = ({ label, value, min, max, step, unit = '', onChange }) => (
    <div className="space-y-1.5">
        <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600 font-medium">{label}</label>
            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {value}{unit}
            </span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
    </div>
);

const TextInput: React.FC<{
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
    </div>
);

const BUILT_IN_FONTS = [
    { key: 'sans',             label: 'Inter (Sans Serif)',  style: 'Inter, sans-serif' },
    { key: 'serif',            label: 'Georgia (Serif)',     style: 'Georgia, serif' },
    { key: 'mono',             label: 'Fira Code (Mono)',    style: 'Fira Code, monospace' },
    { key: 'arial',            label: 'Arial',               style: 'Arial, Helvetica, sans-serif' },
    { key: 'times-new-roman',  label: 'Times New Roman',     style: "'Times New Roman', Times, serif" },
    { key: 'courier-new',      label: 'Courier New',         style: "'Courier New', Courier, monospace" },
    { key: 'verdana',          label: 'Verdana',             style: 'Verdana, Geneva, sans-serif' },
];

const FontDropdown: React.FC<{
    label: string;
    value: string;
    customFonts: CustomFont[];
    onChange: (v: string) => void;
}> = ({ label, value, customFonts, onChange }) => {
    return (
        <div className="space-y-1.5">
            <label className="text-sm text-gray-600 font-medium">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                style={{
                    fontFamily: BUILT_IN_FONTS.find((f) => f.key === value)?.style
                        ?? (customFonts.find((f) => f.name === value) ? `'${value}', sans-serif` : undefined),
                }}
            >
                {BUILT_IN_FONTS.map((f) => (
                    <option key={f.key} value={f.key} style={{ fontFamily: f.style }}>
                        {f.label}
                    </option>
                ))}
                {customFonts.length > 0 && (
                    <optgroup label="Custom Fonts">
                        {customFonts.map((f) => (
                            <option key={f.name} value={f.name}>
                                {f.name}
                            </option>
                        ))}
                    </optgroup>
                )}
            </select>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Reset-confirm modal
// ---------------------------------------------------------------------------

type ResetSectionId = 'typography' | 'colors' | 'callouts' | 'layout' | 'headerFooter' | 'customFonts' | 'worksheet';

const RESET_SECTIONS: { id: ResetSectionId; label: string; desc: string }[] = [
    { id: 'typography',   label: 'Typography',     desc: 'Fonts, font size, line height' },
    { id: 'colors',       label: 'Colors',          desc: 'All color settings' },
    { id: 'callouts',     label: 'Callouts',        desc: 'Callout text color and per-type overrides' },
    { id: 'layout',       label: 'Layout',          desc: 'Content width and paragraph alignment' },
    { id: 'headerFooter', label: 'Header & Footer', desc: 'Header/footer content and color' },
    { id: 'customFonts',  label: 'Custom Fonts',    desc: 'Remove all uploaded custom fonts' },
    { id: 'worksheet',    label: 'Worksheet',        desc: 'Worksheet element sizes, border and colors' },
];

function applyPartialReset(current: StyleSettings, sections: Set<ResetSectionId>): StyleSettings {
    const next = { ...current };
    const d = DEFAULT_STYLE_SETTINGS;
    if (sections.has('typography')) {
        next.fontFamily = d.fontFamily;
        next.headingFontFamily = d.headingFontFamily;
        next.fontSize = d.fontSize;
        next.lineHeight = d.lineHeight;
    }
    if (sections.has('colors')) {
        next.accentColor = d.accentColor;
        next.headingColor = d.headingColor;
        next.h1Color = d.h1Color; next.h2Color = d.h2Color;
        next.h3Color = d.h3Color; next.h4Color = d.h4Color;
        next.textColor = d.textColor;
        next.paragraphColor = d.paragraphColor;
        next.backgroundColor = d.backgroundColor;
        next.codeBgColor = d.codeBgColor; next.codeTextColor = d.codeTextColor;
        next.tableBorderColor = d.tableBorderColor; next.tableHeaderBg = d.tableHeaderBg;
        next.tableHeaderColor = d.tableHeaderColor; next.tableStripeColor = d.tableStripeColor;
        next.linkColor = d.linkColor;
    }
    if (sections.has('callouts')) {
        next.calloutTextColor = d.calloutTextColor;
        next.calloutColors = { ...d.calloutColors };
    }
    if (sections.has('layout')) {
        next.maxContentWidth = d.maxContentWidth;
        next.paragraphAlign = d.paragraphAlign;
        next.orientation = d.orientation;
    }
    if (sections.has('headerFooter')) {
        next.headerLeft = d.headerLeft; next.headerCenter = d.headerCenter; next.headerRight = d.headerRight;
        next.footerLeft = d.footerLeft; next.footerCenter = d.footerCenter; next.footerRight = d.footerRight;
        next.headerFooterColor = d.headerFooterColor;
    }
    if (sections.has('customFonts')) {
        next.customFonts = [];
        if (!BUILT_IN_FONTS.some((f) => f.key === next.fontFamily)) next.fontFamily = d.fontFamily;
        if (!BUILT_IN_FONTS.some((f) => f.key === next.headingFontFamily)) next.headingFontFamily = d.headingFontFamily;
    }
    if (sections.has('worksheet')) {
        next.worksheetLineHeightMm = d.worksheetLineHeightMm;
        next.worksheetGridSizeMm = d.worksheetGridSizeMm;
        next.worksheetSpaceBorder = d.worksheetSpaceBorder;
        next.worksheetLineColor = d.worksheetLineColor;
        next.worksheetGridColor = d.worksheetGridColor;
        next.worksheetBorderColor = d.worksheetBorderColor;
    }
    return next;
}

const ResetConfirmModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (sections: Set<ResetSectionId>) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
    const [checked, setChecked] = useState<Set<ResetSectionId>>(
        () => new Set(RESET_SECTIONS.map((s) => s.id))
    );

    useEffect(() => {
        if (isOpen) setChecked(new Set(RESET_SECTIONS.map((s) => s.id)));
    }, [isOpen]);

    if (!isOpen) return null;

    const allChecked = checked.size === RESET_SECTIONS.length;
    const toggle = (id: ResetSectionId) =>
        setChecked((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 pt-5 pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                            <RotateCcw size={17} className="text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">Reset Settings</h3>
                            <p className="text-xs text-gray-500">Choose which settings to reset to defaults.</p>
                        </div>
                    </div>
                </div>

                {/* Select-all row */}
                <div className="px-6 pb-1">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none py-1.5 border-b border-gray-100">
                        <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={() =>
                                setChecked(
                                    allChecked
                                        ? new Set()
                                        : new Set(RESET_SECTIONS.map((s) => s.id))
                                )
                            }
                            className="w-4 h-4 rounded accent-red-600 cursor-pointer"
                        />
                        <span className="text-sm font-semibold text-gray-700">Select all</span>
                    </label>
                </div>

                {/* Section checkboxes */}
                <div className="px-6 py-3 space-y-3">
                    {RESET_SECTIONS.map((section) => (
                        <label key={section.id} className="flex items-start gap-2.5 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={checked.has(section.id)}
                                onChange={() => toggle(section.id)}
                                className="mt-0.5 w-4 h-4 rounded accent-red-600 cursor-pointer"
                            />
                            <div>
                                <p className="text-sm font-medium text-gray-800">{section.label}</p>
                                <p className="text-xs text-gray-400">{section.desc}</p>
                            </div>
                        </label>
                    ))}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => { onConfirm(checked); onClose(); }}
                        disabled={checked.size === 0}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                        Reset Selected
                    </button>
                </div>
            </div>
        </div>
    );
};

export const StylesModal: React.FC<StylesModalProps> = ({
    isOpen,
    onClose,
    settings,
    onSettingsChange,
}) => {
    const [activeTab, setActiveTab] = useState<TabId>('typography');
    const [localSettings, setLocalSettings] = useState<StyleSettings>(settings);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const update = (patch: Partial<StyleSettings>) => {
        const next = { ...localSettings, ...patch };
        setLocalSettings(next);
        onSettingsChange(next);
    };

    const updateCalloutColor = (type: string, color: string) => {
        const calloutColors = { ...localSettings.calloutColors, [type]: color };
        update({ calloutColors });
    };

    const resetCalloutColor = (type: string) => {
        const calloutColors = { ...localSettings.calloutColors };
        delete calloutColors[type];
        update({ calloutColors });
    };

    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    const handleReset = () => setIsResetModalOpen(true);

    const handleAddFont = (font: CustomFont) => {
        const existing = localSettings.customFonts ?? [];
        const filtered = existing.filter((f) => f.name !== font.name);
        update({ customFonts: [...filtered, font] });
    };

    const customFontFileRef = useRef<HTMLInputElement>(null);

    const handleFontFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const name = file.name.replace(/\.[^.]+$/, '');
        const reader = new FileReader();
        reader.onload = () => handleAddFont({ name, dataUrl: reader.result as string });
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleRemoveFont = (name: string) => {
        const customFonts = (localSettings.customFonts ?? []).filter((f) => f.name !== name);
        const patch: Partial<StyleSettings> = { customFonts };
        // If the removed font was selected, fall back to 'sans'
        if (localSettings.fontFamily === name) patch.fontFamily = 'sans';
        if (localSettings.headingFontFamily === name) patch.headingFontFamily = 'sans';
        update(patch);
    };

    if (!isOpen) return null;

    return (
        <>
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                            <Palette size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Style Settings</h2>
                            <p className="text-xs text-gray-500">Customize your preview appearance</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-white hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                            title="Reset to defaults"
                        >
                            <RotateCcw size={13} />
                            Reset
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6 gap-1 bg-gray-50/50 overflow-x-auto overflow-y-hidden no-scrollbar">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap',
                                activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            )}
                        >
                            <tab.icon size={15} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {activeTab === 'typography' && (
                        <>
                            <FontDropdown
                                label="Body Font"
                                value={localSettings.fontFamily}
                                customFonts={localSettings.customFonts ?? []}
                                onChange={(v) => update({ fontFamily: v })}
                            />
                            <FontDropdown
                                label="Heading Font"
                                value={localSettings.headingFontFamily}
                                customFonts={localSettings.customFonts ?? []}
                                onChange={(v) => update({ headingFontFamily: v })}
                            />

                            {/* Shared custom fonts manager */}
                            <div className="space-y-2 pt-1 border-t border-gray-100">
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-sm text-gray-600 font-medium">Custom Fonts</span>
                                    <button
                                        type="button"
                                        onClick={() => customFontFileRef.current?.click()}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                                    >
                                        <Upload size={13} />
                                        Upload font
                                    </button>
                                    <input
                                        ref={customFontFileRef}
                                        type="file"
                                        accept=".ttf,.otf,.woff,.woff2"
                                        className="hidden"
                                        onChange={handleFontFileChange}
                                    />
                                </div>
                                {(localSettings.customFonts ?? []).length > 0 ? (
                                    <div className="space-y-1">
                                        {(localSettings.customFonts ?? []).map((f) => (
                                            <div
                                                key={f.name}
                                                className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg bg-gray-50 border border-gray-100"
                                            >
                                                <span className="text-gray-600 truncate" style={{ fontFamily: `'${f.name}', sans-serif` }}>
                                                    {f.name}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveFont(f.name)}
                                                    className="ml-2 flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                                                    title={`Remove ${f.name}`}
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 text-center py-2">No custom fonts uploaded yet</p>
                                )}
                            </div>
                            <SliderInput
                                label="Font Size"
                                value={localSettings.fontSize}
                                min={12}
                                max={24}
                                step={1}
                                unit="px"
                                onChange={(v) => update({ fontSize: v })}
                            />
                            <SliderInput
                                label="Line Height"
                                value={localSettings.lineHeight}
                                min={1.2}
                                max={2.2}
                                step={0.1}
                                onChange={(v) => update({ lineHeight: v })}
                            />
                        </>
                    )}

                    {activeTab === 'colors' && (
                        <div className="space-y-4">
                            <ColorInput
                                label="Accent Color"
                                value={localSettings.accentColor}
                                onChange={(v) => update({ accentColor: v })}
                            />

                            <div className="border-t border-gray-100 pt-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Headings</h3>
                                <div className="space-y-3">
                                    <ColorInput
                                        label="All Headings (default)"
                                        value={localSettings.headingColor}
                                        onChange={(v) => update({ headingColor: v })}
                                    />
                                    <ColorInput
                                        label="H1 Override"
                                        value={localSettings.h1Color}
                                        onChange={(v) => update({ h1Color: v })}
                                        placeholder="inherit"
                                    />
                                    <ColorInput
                                        label="H2 Override"
                                        value={localSettings.h2Color}
                                        onChange={(v) => update({ h2Color: v })}
                                        placeholder="inherit"
                                    />
                                    <ColorInput
                                        label="H3 Override"
                                        value={localSettings.h3Color}
                                        onChange={(v) => update({ h3Color: v })}
                                        placeholder="inherit"
                                    />
                                    <ColorInput
                                        label="H4 Override"
                                        value={localSettings.h4Color}
                                        onChange={(v) => update({ h4Color: v })}
                                        placeholder="inherit"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Text</h3>
                                <div className="space-y-3">
                                    <ColorInput
                                        label="Text Color"
                                        value={localSettings.textColor}
                                        onChange={(v) => update({ textColor: v })}
                                    />
                                    <ColorInput
                                        label="Paragraph Color"
                                        value={localSettings.paragraphColor}
                                        onChange={(v) => update({ paragraphColor: v })}
                                        placeholder="inherit"
                                    />
                                    <ColorInput
                                        label="Link Color"
                                        value={localSettings.linkColor}
                                        onChange={(v) => update({ linkColor: v })}
                                        placeholder="accent color"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Background</h3>
                                <div className="space-y-3">
                                    <ColorInput
                                        label="Background"
                                        value={localSettings.backgroundColor}
                                        onChange={(v) => update({ backgroundColor: v })}
                                    />
                                    <ColorInput
                                        label="Code Background"
                                        value={localSettings.codeBgColor}
                                        onChange={(v) => update({ codeBgColor: v })}
                                    />
                                    <ColorInput
                                        label="Code Text"
                                        value={localSettings.codeTextColor}
                                        onChange={(v) => update({ codeTextColor: v })}
                                        placeholder="inherit"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Tables</h3>
                                <div className="space-y-3">
                                    <ColorInput
                                        label="Header Background"
                                        value={localSettings.tableHeaderBg}
                                        onChange={(v) => update({ tableHeaderBg: v })}
                                    />
                                    <ColorInput
                                        label="Header Text"
                                        value={localSettings.tableHeaderColor}
                                        onChange={(v) => update({ tableHeaderColor: v })}
                                    />
                                    <ColorInput
                                        label="Row Stripe"
                                        value={localSettings.tableStripeColor}
                                        onChange={(v) => update({ tableStripeColor: v })}
                                    />
                                    <ColorInput
                                        label="Border"
                                        value={localSettings.tableBorderColor}
                                        onChange={(v) => update({ tableBorderColor: v })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'callouts' && (
                        <div className="space-y-3">
                            <div className="pb-3 border-b border-gray-100">
                                <ColorInput
                                    label="Callout Text Color"
                                    value={localSettings.calloutTextColor}
                                    onChange={(v) => update({ calloutTextColor: v })}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mb-2">
                                Customize the accent color for each callout type. Click reset to use the default.
                            </p>
                            {Object.entries(CALLOUT_TYPES).map(([type, def]) => {
                                const customColor = localSettings.calloutColors[type];
                                const currentColor = customColor || def.color;
                                return (
                                    <div key={type} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50/80 border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">{def.icon}</span>
                                            <div>
                                                <span className="text-sm font-semibold capitalize text-gray-800">{type}</span>
                                                {def.aliases.length > 0 && (
                                                    <span className="text-xs text-gray-400 ml-2">
                                                        ({def.aliases.join(', ')})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={currentColor}
                                                onChange={(e) => updateCalloutColor(type, e.target.value)}
                                                className="w-7 h-7 rounded-lg border border-gray-200 cursor-pointer"
                                                style={{ padding: 0 }}
                                            />
                                            {customColor && (
                                                <button
                                                    onClick={() => resetCalloutColor(type)}
                                                    className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 hover:bg-white transition-colors"
                                                >
                                                    ↺
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'layout' && (
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm text-gray-600 font-medium">Page Orientation</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['portrait', 'landscape'] as const).map((o) => (
                                        <button
                                            key={o}
                                            onClick={() => update({ orientation: o })}
                                            className={clsx(
                                                'px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all capitalize',
                                                localSettings.orientation === o
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                            )}
                                        >
                                            {o}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <SliderInput
                                label="Max Content Width"
                                value={localSettings.maxContentWidth}
                                min={500}
                                max={1400}
                                step={50}
                                unit="px"
                                onChange={(v) => update({ maxContentWidth: v })}
                            />
                            <div className="space-y-2">
                                <label className="text-sm text-gray-600 font-medium">Paragraph Alignment</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['left', 'justify'] as const).map((a) => (
                                        <button
                                            key={a}
                                            onClick={() => update({ paragraphAlign: a })}
                                            className={clsx(
                                                'px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all capitalize',
                                                localSettings.paragraphAlign === a
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                            )}
                                        >
                                            {a}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'worksheet' && (
                        <div className="space-y-5">
                            <SliderInput
                                label="Line Row Height"
                                value={localSettings.worksheetLineHeightMm}
                                min={4}
                                max={15}
                                step={0.5}
                                unit="mm"
                                onChange={(v) => update({ worksheetLineHeightMm: v })}
                            />
                            <SliderInput
                                label="Grid Cell Size (Karo)"
                                value={localSettings.worksheetGridSizeMm}
                                min={3}
                                max={15}
                                step={0.5}
                                unit="mm"
                                onChange={(v) => update({ worksheetGridSizeMm: v })}
                            />
                            <div className="space-y-2">
                                <label className="text-sm text-gray-600 font-medium">Empty Space Border</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['none', 'dashed', 'solid'] as const).map((style) => (
                                        <button
                                            key={style}
                                            onClick={() => update({ worksheetSpaceBorder: style })}
                                            className={clsx(
                                                'px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all capitalize',
                                                localSettings.worksheetSpaceBorder === style
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                            )}
                                        >
                                            {style === 'none' ? 'None' : style === 'dashed' ? 'Dashed' : 'Solid'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="border-t border-gray-100 pt-4 space-y-3">
                                <h3 className="text-sm font-semibold text-gray-700">Colors</h3>
                                <ColorInput
                                    label="Line Color (Zeilen)"
                                    value={localSettings.worksheetLineColor}
                                    onChange={(v) => update({ worksheetLineColor: v })}
                                />
                                <ColorInput
                                    label="Grid Color (Karo)"
                                    value={localSettings.worksheetGridColor}
                                    onChange={(v) => update({ worksheetGridColor: v })}
                                />
                                <ColorInput
                                    label="Border Color"
                                    value={localSettings.worksheetBorderColor}
                                    onChange={(v) => update({ worksheetBorderColor: v })}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'export' && (
                      <div className="space-y-6">
                        <div className="rounded-lg border border-gray-200 overflow-hidden text-xs">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 text-left">
                                        <th className="px-3 py-1.5 font-semibold text-gray-600 border-b border-gray-200">Command</th>
                                        <th className="px-3 py-1.5 font-semibold text-gray-600 border-b border-gray-200">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {([
                                        ['{page}',     'Current page number'],
                                        ['{pages}',    'Total number of pages'],
                                        ['{date}',     'Current date (e.g. Jun 25, 2026)'],
                                        ['{time}',     'Current time (e.g. 14:30)'],
                                        ['{year}',     'Current year (e.g. 2026)'],
                                        ['{doc_name}', 'Document title'],
                                    ] as const).map(([cmd, desc], i) => (
                                        <tr key={cmd} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="px-3 py-1.5 font-mono text-indigo-600 border-b border-gray-100">{cmd}</td>
                                            <td className="px-3 py-1.5 text-gray-600 border-b border-gray-100">{desc}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Appearance</h3>
                            <ColorInput
                                label="Header & Footer Color"
                                value={localSettings.headerFooterColor}
                                onChange={(v) => update({ headerFooterColor: v })}
                            />
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Header</h3>
                            <div className="grid grid-cols-3 gap-3">
                                <TextInput
                                    label="Left"
                                    value={localSettings.headerLeft}
                                    onChange={(v) => update({ headerLeft: v })}
                                    placeholder="Title"
                                />
                                <TextInput
                                    label="Center"
                                    value={localSettings.headerCenter}
                                    onChange={(v) => update({ headerCenter: v })}
                                    placeholder=""
                                />
                                <TextInput
                                    label="Right"
                                    value={localSettings.headerRight}
                                    onChange={(v) => update({ headerRight: v })}
                                    placeholder="{date}"
                                />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">Footer</h3>
                            <div className="grid grid-cols-3 gap-3">
                                <TextInput
                                    label="Left"
                                    value={localSettings.footerLeft}
                                    onChange={(v) => update({ footerLeft: v })}
                                    placeholder="Confidential"
                                />
                                <TextInput
                                    label="Center"
                                    value={localSettings.footerCenter}
                                    onChange={(v) => update({ footerCenter: v })}
                                    placeholder="Page {page} of {pages}"
                                />
                                <TextInput
                                    label="Right"
                                    value={localSettings.footerRight}
                                    onChange={(v) => update({ footerRight: v })}
                                    placeholder="{page}"
                                />
                            </div>
                        </div>

                        <div className="pt-2 text-xs text-gray-400">
                            These settings apply to PDF export and Page Preview.
                        </div>
                      </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl shadow-md transition-all"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
        <ResetConfirmModal
            isOpen={isResetModalOpen}
            onClose={() => setIsResetModalOpen(false)}
            onConfirm={(sections) => {
                const next = applyPartialReset(localSettings, sections);
                setLocalSettings(next);
                onSettingsChange(next);
            }}
        />
        </>
    );
};
