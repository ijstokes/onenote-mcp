import { describe, expect, it } from 'vitest';
import { pickByNameOrId } from '../src/lib/selection.js';

describe('pickByNameOrId', () => {
  const items = [
    { id: '1', displayName: 'Alpha' },
    { id: '2', displayName: 'Beta' }
  ];

  it('selects exact name match', () => {
    const result = pickByNameOrId(items, 'Alpha');
    expect(result.item?.id).toBe('1');
  });

  it('selects by id', () => {
    const result = pickByNameOrId(items, '2');
    expect(result.item?.displayName).toBe('Beta');
  });

  it('returns first item when allowEmpty', () => {
    const result = pickByNameOrId(items, null, { allowEmpty: true });
    expect(result.item?.id).toBe('1');
  });
});
