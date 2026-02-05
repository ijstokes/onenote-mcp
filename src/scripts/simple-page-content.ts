#!/usr/bin/env node

import fetch from 'node-fetch';
import { createGraphClient, readAccessToken } from '../lib/auth.js';
import { fetchAll } from '../lib/pagination.js';
import { pickByNameOrId } from '../lib/selection.js';

async function getPageContent() {
  try {
    const accessToken = await readAccessToken();
    if (!accessToken) {
      console.error('No access token found');
      return;
    }

    const client = await createGraphClient(accessToken);

    console.log('Fetching pages...');
    const pages = await fetchAll<any>(client, '/me/onenote/pages');

    if (!pages || pages.length === 0) {
      console.log('No pages found');
      return;
    }

    const page = pickByNameOrId(pages, null, { allowEmpty: true }).item;
    if (!page) {
      console.log('No page selected.');
      return;
    }

    console.log(`Using page: "${page.title}" (ID: ${page.id})`);
    console.log('Fetching page content...');

    try {
      const url = `https://graph.microsoft.com/v1.0/me/onenote/pages/${page.id}/content`;
      console.log(`Making request to: ${url}`);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(
          `HTTP error! Status: ${response.status} ${response.statusText}`
        );
      }

      const contentType = response.headers.get('content-type');
      console.log(`Content type: ${contentType}`);

      const content = await response.text();
      console.log(`Content received! Length: ${content.length} characters`);
      console.log(
        `Content preview (first 100 chars): ${content
          .substring(0, 100)
          .replace(/\n/g, ' ')}...`
      );

      console.log(
        'Content retrieval successful! Privacy preserved - not saving to disk.'
      );
    } catch (error) {
      console.error('Error fetching content:', error);
    }
  } catch (error) {
    console.error('Error:', (error as Error).message || error);
  }
}

getPageContent();
