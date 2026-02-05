import { createGraphClient } from '../lib/auth.js';
import { fetchAllGroups, pickGroup } from '../lib/groups.js';
import { getOnenoteRoot } from '../lib/onenote-paths.js';
import { pickByNameOrId } from '../lib/selection.js';
import { fetchAll } from '../lib/pagination.js';

async function listGroupPages() {
  try {
    const [groupQuery, ...sectionParts] = process.argv.slice(2);
    const sectionQuery = sectionParts.join(' ').trim();

    if (!groupQuery || !sectionQuery) {
      console.error(
        'Usage: node list-group-pages.js "<group name or id>" "<section name or id>"'
      );
      process.exit(1);
    }

    const client = await createGraphClient();

    console.log('Fetching groups...');
    const groups = await fetchAllGroups(client);

    const selection = pickGroup(groups, groupQuery);
    if (!selection.item) {
      console.log('No matching group found.');
      if (selection.matches && selection.matches.length > 1) {
        console.log('Multiple matches found:');
        selection.matches.forEach((group, index) => {
          console.log(`${index + 1}. ${group.displayName} (id: ${group.id})`);
        });
      }
      return;
    }

    const group = selection.item;
    console.log(`\nGroup: ${group.displayName} (id: ${group.id})`);
    console.log('Fetching sections...');
    const sections = await fetchAll<any>(
      client,
      `${getOnenoteRoot({ scope: 'group', groupId: group.id })}/sections?$select=id,displayName`
    );

    if (sections.length === 0) {
      console.log('No sections found.');
      return;
    }

    const sectionSelection = pickByNameOrId(sections, sectionQuery);
    if (!sectionSelection.item) {
      console.log('No matching section found.');
      if (sectionSelection.matches && sectionSelection.matches.length > 1) {
        console.log('Multiple matches found:');
        sectionSelection.matches.forEach((section, index) => {
          console.log(
            `${index + 1}. ${section.displayName} (id: ${section.id})`
          );
        });
      }
      return;
    }

    const section = sectionSelection.item;
    console.log(`\nSection: ${section.displayName} (id: ${section.id})`);
    console.log('Fetching pages...');
    const pages = await fetchAll<any>(
      client,
      `${getOnenoteRoot({ scope: 'group', groupId: group.id })}/sections/${section.id}/pages`
    );

    console.log('\nPages:');
    console.log('======');
    if (!pages || pages.length === 0) {
      console.log('No pages found.');
      return;
    }

    pages.forEach((page, index) => {
      console.log(`${index + 1}. ${page.title}`);
    });
  } catch (error) {
    console.error(
      'Error listing group pages:',
      (error as Error).message || error
    );
  }
}

listGroupPages();
