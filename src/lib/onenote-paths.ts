export function getOnenoteRoot({
  scope = 'me',
  groupId
}: {
  scope?: 'me' | 'group';
  groupId?: string;
} = {}) {
  if (scope === 'group') {
    if (!groupId) {
      throw new Error('groupId is required when scope is "group".');
    }
    return `/groups/${groupId}/onenote`;
  }

  return '/me/onenote';
}
