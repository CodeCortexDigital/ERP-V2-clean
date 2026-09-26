import { describe, expect, it } from 'vitest';
import { buildSections, sectionOpen } from './navSections';

describe('sidebar sections', () => {
  const items = [
    { id: 'fees', group: 'billing' }, { id: 'dashboard' }, { id: 'students', group: 'people' },
    { id: 'staff', group: 'people' }, { id: 'odd', group: 'nowhere' }, { id: 'settings', group: 'admin' },
  ];

  it('puts items under their headings in a fixed order, keeping their own order', () => {
    const s = buildSections(items);
    expect(s.map((x) => x.group)).toEqual(['', 'people', 'billing', 'admin']);
    expect(s[0].items.map((i) => i.id)).toEqual(['dashboard', 'odd']);
    expect(s[1].items.map((i) => i.id)).toEqual(['students', 'staff']);
  });

  it('keeps a closed heading open while it holds the current page, while searching, or when the sidebar shows icons only', () => {
    const base = { closed: ['people'], searching: false, collapsed: false, hasCurrentPage: false };
    expect(sectionOpen('people', base)).toBe(false);
    expect(sectionOpen('billing', base)).toBe(true);
    expect(sectionOpen('', base)).toBe(true);
    expect(sectionOpen('people', { ...base, hasCurrentPage: true })).toBe(true);
    expect(sectionOpen('people', { ...base, searching: true })).toBe(true);
    expect(sectionOpen('people', { ...base, collapsed: true })).toBe(true);
  });
});
