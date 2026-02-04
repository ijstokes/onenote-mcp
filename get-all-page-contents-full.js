#!/usr/bin/env node

import { createGraphClient, readAccessToken } from './lib/auth.js';
import { fetchAll } from './lib/pagination.js';


// Main function
async function getAllPagesFullContent() {
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
    console.log("Fetching all pages...");
    const pages = await fetchAll(client, '/me/onenote/pages');
    
    if (!pages || pages.length === 0) {
      console.log("No pages found");
      return;
    }
    
    console.log(`Found ${pages.length} pages. Fetching full content for each...\n`);
    
    // Process each page
    for (const page of pages) {
      console.log(`\n==================================================================`);
      console.log(`PAGE: ${page.title}`);
      console.log(`Last modified: ${new Date(page.lastModifiedDateTime).toLocaleString()}`);
      console.log(`==================================================================\n`);
      
      try {
        // Create direct HTTP request to the content endpoint
        const url = page.contentUrl;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (!response.ok) {
          console.error(`Error fetching ${page.title}: ${response.status} ${response.statusText}`);
          continue;
        }
        
        const content = await response.text();
        
        // Extract text content from HTML for easier reading
        console.log("FULL HTML CONTENT:");
        console.log(content);
        console.log("\n");
      } catch (error) {
        console.error(`Error processing ${page.title}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error("Error:", error.message || error);
  }
}

// Run the function
getAllPagesFullContent(); 