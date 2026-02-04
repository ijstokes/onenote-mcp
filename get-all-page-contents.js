#!/usr/bin/env node

import { JSDOM } from 'jsdom';
import { createGraphClient, readAccessToken } from './lib/auth.js';
import { fetchAll } from './lib/pagination.js';

// Function to extract text content from HTML
function extractTextContent(html) {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Extract main content
    const bodyText = document.body.textContent.trim();
    
    // Create a summary (first 300 chars or so)
    const summary = bodyText.substring(0, 300).replace(/\s+/g, ' ');
    
    return summary.length < bodyText.length 
      ? `${summary}...` 
      : summary;
  } catch (error) {
    console.error('Error extracting text:', error);
    return 'Could not extract text content';
  }
}

// Main function
async function getAllPageContents() {
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
    
    console.log(`Found ${pages.length} pages. Fetching content for each...`);
    
    // Process each page
    for (const page of pages) {
      console.log(`\n===== ${page.title} =====`);
      
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
        const textSummary = extractTextContent(content);
        
        console.log(`Last modified: ${new Date(page.lastModifiedDateTime).toLocaleString()}`);
        console.log(`Content summary: ${textSummary}`);
      } catch (error) {
        console.error(`Error processing ${page.title}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error("Error:", error.message || error);
  }
}

// Run the function
getAllPageContents(); 