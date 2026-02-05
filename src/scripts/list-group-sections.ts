import { createGraphClient } from '../lib/auth.js';
import { fetchAllGroups, pickGroup } from '../lib/groups.js';
import { getOnenoteRoot } from '../lib/onenote-paths.js';
import { pickByNameOrId } from '../lib/selection.js';
import { fetchAll } from '../lib/pagination.js';

async function listGroupSections() {
  try {
    const [groupQuery, ...notebookParts] = process.argv.slice(2);
    const notebookQuery = notebookParts.join(' ').trim();

    if (!groupQuery) {
      console.error(
        'Usage: node list-group-sections.js "<group name or id>" ["notebook name or id"]'
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
    console.log('Fetching notebooks...');
    const notebooks = await fetchAll<any>(
      client,
      `${getOnenoteRoot({ scope: 'group', groupId: group.id })}/notebooks`
    );

    if (!notebooks || notebooks.length === 0) {
      console.log('No notebooks found.');
      return;
    }

    const notebookSelection = pickByNameOrId(notebooks, notebookQuery, {
      allowEmpty: true
    });
    if (!notebookSelection.item) {
      console.log('No matching notebook found.');
      if (notebookSelection.matches && notebookSelection.matches.length > 1) {
        console.log('Multiple matches found:');
        notebookSelection.matches.forEach((notebook, index) => {
          console.log(
            `${index + 1}. ${notebook.displayName} (id: ${notebook.id})`
          );
        });
      }
      return;
    }

    const notebook = notebookSelection.item;
    console.log(`\nNotebook: ${notebook.displayName} (id: ${notebook.id})`);
    console.log('Fetching sections...');
    const sections = await fetchAll<any>(
      client,
      `${getOnenoteRoot({ scope: 'group', groupId: group.id })}/notebooks/${notebook.id}/sections`
    );

    console.log('\nSections:');
    console.log('==========');
    if (!sections || sections.length === 0) {
      console.log('No sections found.');
      return;
    }

    sections.forEach((section, index) => {
      console.log(`${index + 1}. ${section.displayName}`);
    });
  } catch (error) {
    console.error(
      'Error listing group sections:',
      (error as Error).message || error
    );
  }
}

listGroupSections();
