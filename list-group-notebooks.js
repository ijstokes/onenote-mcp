import { createGraphClient } from './lib/auth.js';
import { fetchAllGroups, pickGroup } from './lib/groups.js';
import { getOnenoteRoot } from './lib/onenote-paths.js';
import { fetchAll } from './lib/pagination.js';

async function listGroupNotebooks() {
  try {
    const query = process.argv.slice(2).join(' ').trim();
    if (!query) {
      console.error('Usage: node list-group-notebooks.js "<group name or id>"');
      process.exit(1);
    }

    const client = createGraphClient();

    console.log('Fetching groups...');
    const groups = await fetchAllGroups(client);

    const selection = pickGroup(groups, query);
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
    const notebooks = await fetchAll(
      client,
      `${getOnenoteRoot({ scope: 'group', groupId: group.id })}/notebooks`
    );

    console.log('\nNotebooks:');
    console.log('==========');
    if (!notebooks || notebooks.length === 0) {
      console.log('No notebooks found.');
      return;
    }

    notebooks.forEach((notebook, index) => {
      console.log(`${index + 1}. ${notebook.displayName}`);
    });
  } catch (error) {
    console.error('Error listing group notebooks:', error.message || error);
  }
}

listGroupNotebooks();
