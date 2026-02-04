#!/usr/bin/env node

import { createGraphClient, readAccessToken } from './lib/auth.js';
import { fetchAll } from './lib/pagination.js';
import { pickByNameOrId } from './lib/selection.js';

// Main function
async function getPageContent() {
  try {
    // Get the access token
    const accessToken = readAccessToken();
    if (!accessToken) {
      console.error('No access token found');
      return;
    }
    
    // Initialize Graph client
    const client = createGraphClient(accessToken);
    
    // List pages
    console.log("Fetching pages...");
    const pages = await fetchAll(client, '/me/onenote/pages');
    
    if (!pages || pages.length === 0) {
      console.log("No pages found");
      return;
    }
    
    // Choose the first page
    const page = pickByNameOrId(pages, null, { allowEmpty: true }).item;
    console.log(`Using page: "${page.title}" (ID: ${page.id})`);
    
    // Try to get the content
    console.log("Fetching page content...");
    
    try {
      // Create direct HTTP request to the content endpoint
      const url = `https://graph.microsoft.com/v1.0/me/onenote/pages/${page.id}/content`;
      console.log(`Making request to: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      console.log(`Content type: ${contentType}`);
      
      const content = await response.text();
      console.log(`Content received! Length: ${content.length} characters`);
      console.log(`Content preview (first 100 chars): ${content.substring(0, 100).replace(/\n/g, ' ')}...`);
      
      // Don't save content to file - just confirm it worked
      console.log("Content retrieval successful! Privacy preserved - not saving to disk.");
    } catch (error) {
      console.error("Error fetching content:", error);
    }
    
  } catch (error) {
    console.error("Error:", error.message || error);
  }
}

// Run the function
getPageContent(); 