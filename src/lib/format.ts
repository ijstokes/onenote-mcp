import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import PDFDocument from 'pdfkit';

export type OutputFormat = 'html' | 'text' | 'markdown' | 'pdf';

/**
 * Extract readable plain text from HTML using JSDOM.
 * Refactored from read-all-pages.ts extractReadableText.
 */
export function htmlToText(html: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const scripts = document.querySelectorAll('script');
  scripts.forEach((script: Element) => script.remove());

  let text = '';

  document
    .querySelectorAll('h1, h2, h3, h4, h5, h6')
    .forEach((heading: Element) => {
      const headingText = heading.textContent?.trim() ?? '';
      if (headingText) {
        text += `\n${headingText}\n${'-'.repeat(headingText.length)}\n`;
      }
    });

  document.querySelectorAll('p').forEach((paragraph: Element) => {
    const content = paragraph.textContent?.trim() ?? '';
    if (content) {
      text += `${content}\n\n`;
    }
  });

  document.querySelectorAll('ul, ol').forEach((list: Element) => {
    text += '\n';
    list.querySelectorAll('li').forEach((item: Element, index: number) => {
      const content = item.textContent?.trim() ?? '';
      if (content) {
        text += `${index + 1}. ${content}\n`;
      }
    });
    text += '\n';
  });

  document.querySelectorAll('div, span').forEach((element: Element) => {
    if (
      element.childNodes.length === 1 &&
      element.childNodes[0].nodeType === 3
    ) {
      const content = element.textContent?.trim() ?? '';
      if (content) {
        text += `${content}\n\n`;
      }
    }
  });

  document.querySelectorAll('table').forEach((table: Element) => {
    text += '\nTable content:\n';
    table.querySelectorAll('tr').forEach((row: Element) => {
      const cells = Array.from(row.querySelectorAll('td, th'))
        .map((cell: Element) => cell.textContent?.trim() ?? '')
        .join(' | ');
      text += `${cells}\n`;
    });
    text += '\n';
  });

  if (!text.trim()) {
    text = document.body?.textContent?.trim().replace(/\s+/g, ' ') ?? '';
  }

  return text;
}

/**
 * Convert HTML to Markdown using Turndown.
 */
export function htmlToMarkdown(html: string): string {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  });
  return turndown.turndown(html);
}

/**
 * Convert HTML to a text-based PDF and return as a base64 string.
 */
export async function htmlToPdfBase64(html: string): Promise<string> {
  const plainText = htmlToText(html);

  return new Promise<string>((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer.toString('base64'));
    });
    doc.on('error', reject);

    doc.fontSize(12).text(plainText, { align: 'left' });
    doc.end();
  });
}

/**
 * Dispatcher: convert HTML to the requested output format.
 * Defaults to returning the original HTML.
 */
export async function formatPageContent(
  html: string,
  format: OutputFormat = 'html'
): Promise<string> {
  switch (format) {
    case 'text':
      return htmlToText(html);
    case 'markdown':
      return htmlToMarkdown(html);
    case 'pdf':
      return htmlToPdfBase64(html);
    case 'html':
    default:
      return html;
  }
}
