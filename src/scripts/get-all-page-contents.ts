#!/usr/bin/env node

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { createGraphClient, readAccessToken } from '../lib/auth.js';
import { fetchAll } from '../lib/pagination.js';

function extractTextContent(html: string) {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const bodyText = document.body.textContent?.trim() ?? '';
    const summary = bodyText.substring(0, 300).replace(/\s+/g, ' ');

    return summary.length < bodyText.length ? `${summary}...` : summary;
  } catch (error) {
    console.error('Error extracting text:', error);
    return 'Could not extract text content';
  }
}

async function getAllPageContents() {
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

    console.log(`Found ${pages.length} pages. Fetching content for each...`);

    for (const page of pages) {
      console.log(`\n===== ${page.title} =====`);

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

        const content = await response.text();
        const textSummary = extractTextContent(content);

        console.log(
          `Last modified: ${new Date(page.lastModifiedDateTime).toLocaleString()}`
        );
        console.log(`Content summary: ${textSummary}`);
      } catch (error) {
        console.error(
          `Error processing ${page.title}:`,
          (error as Error).message
        );
      }
    }
  } catch (error) {
    console.error('Error:', (error as Error).message || error);
  }
}

getAllPageContents();
