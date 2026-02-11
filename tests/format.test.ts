import { describe, expect, it } from 'vitest';
import {
  htmlToText,
  htmlToMarkdown,
  htmlToPdfBase64,
  formatPageContent
} from '../src/lib/format.js';

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head><title>Test Page</title></head>
<body>
  <h1>Main Heading</h1>
  <p>This is a <b>bold</b> paragraph.</p>
  <h2>Sub Heading</h2>
  <ul>
    <li>Item one</li>
    <li>Item two</li>
  </ul>
  <table>
    <tr><th>Name</th><th>Value</th></tr>
    <tr><td>Alpha</td><td>100</td></tr>
  </table>
  <script>alert("xss")</script>
</body>
</html>`;

describe('htmlToText', () => {
  it('extracts headings with underlines', () => {
    const text = htmlToText(SAMPLE_HTML);
    expect(text).toContain('Main Heading');
    expect(text).toContain('-'.repeat('Main Heading'.length));
    expect(text).toContain('Sub Heading');
  });

  it('extracts paragraphs', () => {
    const text = htmlToText(SAMPLE_HTML);
    expect(text).toContain('This is a bold paragraph.');
  });

  it('extracts list items', () => {
    const text = htmlToText(SAMPLE_HTML);
    expect(text).toMatch(/1\. Item one/);
    expect(text).toMatch(/2\. Item two/);
  });

  it('extracts table content in pipe format', () => {
    const text = htmlToText(SAMPLE_HTML);
    expect(text).toContain('Name | Value');
    expect(text).toContain('Alpha | 100');
  });

  it('strips script tags', () => {
    const text = htmlToText(SAMPLE_HTML);
    expect(text).not.toContain('alert');
    expect(text).not.toContain('xss');
  });

  it('falls back for plain content', () => {
    const text = htmlToText('<html><body>Just some text</body></html>');
    expect(text).toContain('Just some text');
  });

  it('handles empty HTML', () => {
    const text = htmlToText('<html><body></body></html>');
    expect(text).toBe('');
  });
});

describe('htmlToMarkdown', () => {
  it('converts headings to ATX style', () => {
    const md = htmlToMarkdown(SAMPLE_HTML);
    expect(md).toMatch(/^# Main Heading$/m);
    expect(md).toMatch(/^## Sub Heading$/m);
  });

  it('converts bold text', () => {
    const md = htmlToMarkdown(SAMPLE_HTML);
    expect(md).toContain('**bold**');
  });

  it('converts list items', () => {
    const md = htmlToMarkdown(SAMPLE_HTML);
    expect(md).toMatch(/[*-]\s+Item one/);
    expect(md).toMatch(/[*-]\s+Item two/);
  });

  it('handles minimal HTML', () => {
    const md = htmlToMarkdown('<p>Hello world</p>');
    expect(md).toContain('Hello world');
  });
});

describe('htmlToPdfBase64', () => {
  it('returns a non-empty base64 string', async () => {
    const b64 = await htmlToPdfBase64(SAMPLE_HTML);
    expect(b64.length).toBeGreaterThan(0);
  });

  it('decoded buffer starts with %PDF', async () => {
    const b64 = await htmlToPdfBase64(SAMPLE_HTML);
    const buffer = Buffer.from(b64, 'base64');
    const header = buffer.subarray(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });
});

describe('formatPageContent', () => {
  it('returns html by default', async () => {
    const result = await formatPageContent(SAMPLE_HTML);
    expect(result).toBe(SAMPLE_HTML);
  });

  it('returns html when format is html', async () => {
    const result = await formatPageContent(SAMPLE_HTML, 'html');
    expect(result).toBe(SAMPLE_HTML);
  });

  it('delegates to htmlToText for text format', async () => {
    const result = await formatPageContent(SAMPLE_HTML, 'text');
    expect(result).toContain('Main Heading');
    expect(result).not.toContain('<h1>');
  });

  it('delegates to htmlToMarkdown for markdown format', async () => {
    const result = await formatPageContent(SAMPLE_HTML, 'markdown');
    expect(result).toMatch(/^# Main Heading$/m);
  });

  it('delegates to htmlToPdfBase64 for pdf format', async () => {
    const result = await formatPageContent(SAMPLE_HTML, 'pdf');
    const buffer = Buffer.from(result, 'base64');
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });
});
