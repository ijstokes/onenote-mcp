#!/usr/bin/env node

import fetch from 'node-fetch';
import { createGraphClient, readAccessToken } from '../lib/auth.js';
import { fetchAll } from '../lib/pagination.js';

async function getAllPagesFullContent() {
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
      `Found ${pages.length} pages. Fetching full content for each...\n`
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

        const content = await response.text();

        console.log('FULL HTML CONTENT:');
        console.log(content);
        console.log('\n');
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

getAllPagesFullContent();
