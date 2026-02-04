export function getOnenoteRoot({ scope = 'me', groupId } = {}) {
  if (scope === 'group') {
    if (!groupId) {
      throw new Error('groupId is required when scope is "group".');
    }
    return `/groups/${groupId}/onenote`;
  }

  return '/me/onenote';
}
