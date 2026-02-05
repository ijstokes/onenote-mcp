import { createGraphClient } from '../lib/auth.js';
import { fetchAllGroups } from '../lib/groups.js';
import { getOnenoteRoot } from '../lib/onenote-paths.js';

async function listGroupsWithOneNote() {
  try {
    const client = await createGraphClient();

    console.log('Fetching groups...');
    const groups = await fetchAllGroups(client);

    console.log('Checking OneNote notebooks for each group...');
    const groupsWithNotebooks: Array<{ id: string; displayName: string; notebookCount: number }> = [];

    for (const group of groups) {
      try {
        const notebooks = await client
          .api(`${getOnenoteRoot({ scope: 'group', groupId: group.id })}/notebooks`)
          .get();

        if (notebooks.value && notebooks.value.length > 0) {
          groupsWithNotebooks.push({
            id: group.id,
            displayName: group.displayName,
            notebookCount: notebooks.value.length
          });
        }
      } catch (error) {
        // Ignore groups without OneNote or without access
      }
    }

    console.log('\nGroups with OneNote notebooks:');
    console.log('==============================');

    if (groupsWithNotebooks.length === 0) {
      console.log('No groups with OneNote notebooks found.');
    } else {
      groupsWithNotebooks.forEach((group, index) => {
        console.log(
          `${index + 1}. ${group.displayName} (id: ${group.id}, notebooks: ${group.notebookCount})`
        );
      });
    }
  } catch (error) {
    console.error('Error listing groups:', (error as Error).message || error);
  }
}

listGroupsWithOneNote();
