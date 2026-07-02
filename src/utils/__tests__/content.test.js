import { describe, it, expect } from 'vitest';
import { detectContentMode } from '@/utils/content.js';

describe('detectContentMode', () => {
  it('returns plain for empty/null content', () => {
    expect(detectContentMode('')).toBe('plain');
    expect(detectContentMode(null)).toBe('plain');
    expect(detectContentMode(undefined)).toBe('plain');
  });

  it('returns markdown for HTML tags', () => {
    expect(detectContentMode('<p>hello</p>')).toBe('markdown');
    expect(detectContentMode('<div>test</div>')).toBe('markdown');
    expect(detectContentMode('before <br> after')).toBe('markdown');
    expect(detectContentMode('<strong>bold</strong>')).toBe('markdown');
    expect(detectContentMode('<img src="x.png"/>')).toBe('markdown');
    expect(detectContentMode('<h1>Title</h1>')).toBe('markdown');
    expect(detectContentMode('<blockquote>quote</blockquote>')).toBe('markdown');
    expect(detectContentMode('<ul><li>item</li></ul>')).toBe('markdown');
  });

  it('returns plain for plain text', () => {
    expect(detectContentMode('hello world')).toBe('plain');
    expect(detectContentMode('# Title')).toBe('plain');
    expect(detectContentMode('**bold**')).toBe('plain');
    expect(detectContentMode('- list item')).toBe('plain');
    expect(detectContentMode('> quote')).toBe('plain');
  });

  it('case insensitive HTML detection', () => {
    expect(detectContentMode('<P>test</P>')).toBe('markdown');
    expect(detectContentMode('<DIV>test</DIV>')).toBe('markdown');
    expect(detectContentMode('<Span>test</Span>')).toBe('markdown');
  });
});
