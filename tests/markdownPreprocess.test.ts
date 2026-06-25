/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { preprocessMarkdown } from '../lib/markdownPreprocess';

describe('markdownPreprocess highlight behavior', () => {
  it('transforms ==highlight== in normal text', () => {
    const output = preprocessMarkdown('This is ==important== text');
    expect(output).toContain('<mark>important</mark>');
  });

  it('does not transform ==...== inside fenced code blocks', () => {
    const input = [
      'Before ==yes==',
      '```ts',
      'const x = "==no==";',
      '```',
      'After ==yes2==',
    ].join('\n');

    const output = preprocessMarkdown(input);
    expect(output).toContain('Before <mark>yes</mark>');
    expect(output).toContain('const x = "==no==";');
    expect(output).toContain('After <mark>yes2</mark>');
  });

  it('does not transform ==...== inside inline code spans', () => {
    const input = 'Inline `code ==no==` and ==yes== outside';
    const output = preprocessMarkdown(input);
    expect(output).toContain('`code ==no==`');
    expect(output).toContain('<mark>yes</mark> outside');
  });

  it('does not transform ==...== inside indented code blocks', () => {
    const input = [
      '    const x = "==no==";',
      'Normal ==yes==',
    ].join('\n');

    const output = preprocessMarkdown(input);
    expect(output).toContain('    const x = "==no==";');
    expect(output).toContain('Normal <mark>yes</mark>');
  });
});

describe('markdownPreprocess worksheet elements', () => {
  it('converts :::space[3]::: to a block div', () => {
    const out = preprocessMarkdown(':::space[3]:::');
    expect(out).toContain('class="md-ws-space"');
    expect(out).toContain('calc(3 * var(--ws-line-height');
  });

  it('converts :::lines[5]::: to a ruled-lines div', () => {
    const out = preprocessMarkdown(':::lines[5]:::');
    expect(out).toContain('class="md-ws-lines"');
    expect(out).toContain('calc(5 * var(--ws-line-height');
    expect(out).toContain('repeating-linear-gradient');
  });

  it('converts :::grid[4]::: to a grid div', () => {
    const out = preprocessMarkdown(':::grid[4]:::');
    expect(out).toContain('class="md-ws-grid"');
    expect(out).toContain('calc(4 * var(--ws-grid-size');
  });

  it('merges consecutive same-type worksheet blocks into one', () => {
    const out = preprocessMarkdown(':::lines[3]:::\n:::lines[2]:::');
    expect(out).toContain('calc(5 * var(--ws-line-height');
    // Should produce exactly one element
    expect((out.match(/md-ws-lines/g) ?? []).length).toBe(1);
  });

  it('does not merge different worksheet types', () => {
    const out = preprocessMarkdown(':::lines[3]:::\n:::grid[2]:::');
    expect(out).toContain('md-ws-lines');
    expect(out).toContain('md-ws-grid');
  });

  it('does not merge worksheet blocks separated by a blank line', () => {
    const out = preprocessMarkdown(':::space[3]:::\n\n:::space[2]:::');
    expect((out.match(/md-ws-space/g) ?? []).length).toBe(2);
  });

  it('does not transform :::lines[5]::: inside fenced code blocks', () => {
    const input = ['```', ':::lines[5]:::', '```'].join('\n');
    const out = preprocessMarkdown(input);
    expect(out).toContain(':::lines[5]:::');
    expect(out).not.toContain('md-ws-lines');
  });
});
