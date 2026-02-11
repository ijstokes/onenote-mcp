#!/usr/bin/env node

import fetch from 'node-fetch';
import { createGraphClient, readAccessToken } from '../lib/auth.js';
import { fetchAll } from '../lib/pagination.js';
import { htmlToText } from '../lib/format.js';

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
        const readableText = htmlToText(htmlContent);

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
