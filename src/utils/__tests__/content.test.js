import { describe, it, expect } from 'vitest';
import { detectContentMode } from '@/utils/content.js';

describe('detectContentMode', () => {
  it('returns rich for empty/null content', () => {
    expect(detectContentMode('')).toBe('rich');
    expect(detectContentMode(null)).toBe('rich');
    expect(detectContentMode(undefined)).toBe('rich');
  });

  it('returns rich for HTML tags', () => {
    expect(detectContentMode('<p>hello</p>')).toBe('rich');
    expect(detectContentMode('<div>test</div>')).toBe('rich');
    expect(detectContentMode('before <br> after')).toBe('rich');
    expect(detectContentMode('<strong>bold</strong>')).toBe('rich');
    expect(detectContentMode('<img src="x.png"/>')).toBe('rich');
    expect(detectContentMode('<h1>Title</h1>')).toBe('rich');
    expect(detectContentMode('<blockquote>quote</blockquote>')).toBe('rich');
    expect(detectContentMode('<ul><li>item</li></ul>')).toBe('rich');
  });

  it('returns markdown for plain text', () => {
    expect(detectContentMode('hello world')).toBe('markdown');
    expect(detectContentMode('# Title')).toBe('markdown');
    expect(detectContentMode('**bold**')).toBe('markdown');
    expect(detectContentMode('- list item')).toBe('markdown');
    expect(detectContentMode('> quote')).toBe('markdown');
  });

  it('case insensitive HTML detection', () => {
    expect(detectContentMode('<P>test</P>')).toBe('rich');
    expect(detectContentMode('<DIV>test</DIV>')).toBe('rich');
    expect(detectContentMode('<Span>test</Span>')).toBe('rich');
  });
});
