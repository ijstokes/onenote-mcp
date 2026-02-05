#!/usr/bin/env node

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { createGraphClient, readAccessToken } from '../lib/auth.js';
import { fetchAll } from '../lib/pagination.js';

function extractReadableText(html: string) {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const scripts = document.querySelectorAll('script');
    scripts.forEach((script) => script.remove());

    let text = '';

    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
      const headingText = heading.textContent?.trim() ?? '';
      if (headingText) {
        text += `\n${headingText}\n${'-'.repeat(headingText.length)}\n`;
      }
    });

    document.querySelectorAll('p').forEach((paragraph) => {
      const content = paragraph.textContent?.trim() ?? '';
      if (content) {
        text += `${content}\n\n`;
      }
    });

    document.querySelectorAll('ul, ol').forEach((list) => {
      text += '\n';
      list.querySelectorAll('li').forEach((item, index) => {
        const content = item.textContent?.trim() ?? '';
        if (content) {
          text += `${index + 1}. ${content}\n`;
        }
      });
      text += '\n';
    });

    document.querySelectorAll('div, span').forEach((element) => {
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

    document.querySelectorAll('table').forEach((table) => {
      text += '\nTable content:\n';
      table.querySelectorAll('tr').forEach((row) => {
        const cells = Array.from(row.querySelectorAll('td, th'))
          .map((cell) => cell.textContent?.trim() ?? '')
          .join(' | ');
        text += `${cells}\n`;
      });
      text += '\n';
    });

    if (!text.trim()) {
      text = document.body.textContent?.trim().replace(/\s+/g, ' ') ?? '';
    }

    return text;
  } catch (error) {
    console.error('Error extracting text:', error);
    return 'Error: Could not extract readable text from HTML content.';
  }
}

async function readAllPages() {
  try {
    const accessToken = await readAccessToken();
    if (!accessToken) {
      console.error('No access token found');
      return;
    }

    const client = await createGraphClient(accessToken);

    console.log('Fetching all pages...');
    const pages = await fetchAll<any>(client, '/me/onenote/pages');

    if (!pages || pages.length === 0) {
      console.log('No pages found');
      return;
    }

    console.log(
      `Found ${pages.length} pages. Reading full content for each...\n`
    );

    for (const page of pages) {
      console.log(
        '\n=================================================================='
      );
      console.log(`PAGE: ${page.title}`);
      console.log(
        `Last modified: ${new Date(page.lastModifiedDateTime).toLocaleString()}`
      );
      console.log(
        '==================================================================\n'
      );

      try {
        const url = page.contentUrl;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          console.error(
            `Error fetching ${page.title}: ${response.status} ${response.statusText}`
          );
          continue;
        }

        const htmlContent = await response.text();
        const readableText = extractReadableText(htmlContent);

        console.log(readableText);
        console.log('\n');
      } catch (error) {
        console.error(
          `Error processing ${page.title}:`,
          (error as Error).message
        );
      }
    }

    console.log(
      '\nAll pages have been read. You can now ask questions about their content.'
    );
  } catch (error) {
    console.error('Error:', (error as Error).message || error);
  }
}

readAllPages();
