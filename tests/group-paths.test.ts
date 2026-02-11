import { describe, it, expect } from 'vitest';
import { parseGroupPath } from '../src/lib/group-paths.js';

describe('parseGroupPath', () => {
  it('parses a single segment as group', () => {
    expect(parseGroupPath('Engineering')).toEqual({
      group: 'Engineering'
    });
  });

  it('parses two segments as group and notebook', () => {
    expect(parseGroupPath('Engineering/Sprint Notes')).toEqual({
      group: 'Engineering',
      notebook: 'Sprint Notes'
    });
  });

  it('parses three segments as group, notebook, and section', () => {
    expect(parseGroupPath('Engineering/Sprint Notes/2024 Q4')).toEqual({
      group: 'Engineering',
      notebook: 'Sprint Notes',
      section: '2024 Q4'
    });
  });

  it('parses four segments as group, notebook, section, and page', () => {
    expect(parseGroupPath('Engineering/Sprint Notes/2024 Q4/Retro')).toEqual({
      group: 'Engineering',
      notebook: 'Sprint Notes',
      section: '2024 Q4',
      page: 'Retro'
    });
  });

  it('throws on empty string', () => {
    expect(() => parseGroupPath('')).toThrow('Path must not be empty.');
  });

  it('throws on whitespace-only string', () => {
    expect(() => parseGroupPath('   ')).toThrow('Path must not be empty.');
  });

  it('trims leading slashes', () => {
    expect(parseGroupPath('/Engineering')).toEqual({
      group: 'Engineering'
    });
  });

  it('trims trailing slashes', () => {
    expect(parseGroupPath('Engineering/')).toEqual({
      group: 'Engineering'
    });
  });

  it('trims both leading and trailing slashes', () => {
    expect(parseGroupPath('/Engineering/Notes/')).toEqual({
      group: 'Engineering',
      notebook: 'Notes'
    });
  });

  it('preserves spaces within segments', () => {
    expect(parseGroupPath('My Group/My Notebook/My Section')).toEqual({
      group: 'My Group',
      notebook: 'My Notebook',
      section: 'My Section'
    });
  });
});
