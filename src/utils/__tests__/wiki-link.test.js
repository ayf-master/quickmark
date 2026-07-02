import { describe, it, expect } from 'vitest';
import {
  parseWikiLinks,
  findNoteByTitle,
  buildLinkIndex,
  findBacklinks,
  findOutlinks,
  buildGraphData
} from '@/utils/wiki-link.js';

describe('parseWikiLinks', () => {
  it('extracts single wiki link', () => {
    expect(parseWikiLinks('参考 [[React笔记]] 了解更多')).toEqual(['React笔记']);
  });

  it('extracts multiple wiki links', () => {
    expect(parseWikiLinks('[[笔记A]] 和 [[笔记B]] 有关')).toEqual(['笔记A', '笔记B']);
  });

  it('returns empty for content without links', () => {
    expect(parseWikiLinks('普通文本')).toEqual([]);
  });

  it('returns empty for null/undefined', () => {
    expect(parseWikiLinks(null)).toEqual([]);
    expect(parseWikiLinks(undefined)).toEqual([]);
  });

  it('deduplicates repeated links', () => {
    expect(parseWikiLinks('[[React]] [[React]]')).toEqual(['React']);
  });

  it('trims whitespace inside brackets', () => {
    expect(parseWikiLinks('[[  笔记标题  ]]')).toEqual(['笔记标题']);
  });

  it('handles mixed content', () => {
    const result = parseWikiLinks('# Hello\n\n参考 [[笔记A]] 和 **bold** [[笔记B]]');
    expect(result).toEqual(['笔记A', '笔记B']);
  });
});

describe('findNoteByTitle', () => {
  const notes = [
    { id: 1, title: 'React' },
    { id: 2, title: 'Vue' }
  ];

  it('finds existing note', () => {
    expect(findNoteByTitle(notes, 'React')).toEqual(notes[0]);
  });

  it('returns null for non-existing title', () => {
    expect(findNoteByTitle(notes, 'Angular')).toBeNull();
  });
});

describe('buildLinkIndex', () => {
  it('builds index from notes array', () => {
    const notes = [
      { id: 1, title: 'A', content: '链接到 [[B]] 和 [[C]]' },
      { id: 2, title: 'B', content: '链接到 [[A]]' },
      { id: 3, title: 'C', content: '无链接' }
    ];
    const index = buildLinkIndex(notes);
    expect(index).toEqual({
      1: ['B', 'C'],
      2: ['A'],
      3: []
    });
  });
});

describe('findBacklinks', () => {
  const notes = [
    { id: 1, title: 'A', content: '[[B]]' },
    { id: 2, title: 'B', content: '[[A]]' },
    { id: 3, title: 'C', content: '[[B]]' }
  ];
  const linkIndex = buildLinkIndex(notes);

  it('finds all backlinks to a note', () => {
    const bl = findBacklinks(2, notes, linkIndex);
    expect(bl).toHaveLength(2);
    expect(bl.map(b => b.id)).toContain(1);
    expect(bl.map(b => b.id)).toContain(3);
  });

  it('returns empty for note with no backlinks', () => {
    expect(findBacklinks(3, notes, linkIndex)).toEqual([]);
  });

  it('does not include self-link', () => {
    const notes2 = [
      { id: 1, title: 'A', content: '[[A]]' }
    ];
    const idx = buildLinkIndex(notes2);
    expect(findBacklinks(1, notes2, idx)).toEqual([]);
  });
});

describe('findOutlinks', () => {
  const notes = [
    { id: 1, title: 'A', content: '[[B]] 和 [[不存在]]' },
    { id: 2, title: 'B', content: '' }
  ];
  const linkIndex = buildLinkIndex(notes);

  it('finds resolved and unresolved outlinks', () => {
    const out = findOutlinks(1, notes, linkIndex);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ title: 'B', annotation: '', note: notes[1] });
    expect(out[1]).toEqual({ title: '不存在', annotation: '', note: null });
  });
});

describe('buildGraphData', () => {
  it('builds nodes and edges correctly', () => {
    const notes = [
      { id: 1, title: 'A', content: '[[B]] [[C]]' },
      { id: 2, title: 'B', content: '[[A]]' },
      { id: 3, title: 'C', content: '无链接' }
    ];
    const linkIndex = buildLinkIndex(notes);
    const { nodes, edges } = buildGraphData(notes, linkIndex);

    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(3); // A→B, A→C, B→A

    const nodeA = nodes.find(n => n.id === 1);
    expect(nodeA.outCount).toBe(2); // links to B, C
    expect(nodeA.inCount).toBe(1); // linked by B
  });

  it('creates two directed edges for bidirectional links', () => {
    const notes = [
      { id: 1, title: 'A', content: '[[B]]' },
      { id: 2, title: 'B', content: '[[A]]' }
    ];
    const linkIndex = buildLinkIndex(notes);
    const { edges } = buildGraphData(notes, linkIndex);
    expect(edges).toHaveLength(2);
    expect(edges[0]).toMatchObject({ source: 1, target: 2 });
    expect(edges[1]).toMatchObject({ source: 2, target: 1 });
  });

  it('handles empty notes', () => {
    const { nodes, edges } = buildGraphData([], {});
    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
  });
});
