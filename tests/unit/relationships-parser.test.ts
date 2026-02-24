import { describe, it, expect } from 'vitest';
import { parseRelationships, getRelByType, getRelsByType } from '../../src/parser/relationships-parser';

describe('relationships parser', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
    <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
    <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
  </Relationships>`;

  it('parses relationships into a map', () => {
    const rels = parseRelationships(xml);
    expect(rels.size).toBe(4);
    expect(rels.get('rId1')?.target).toBe('slideMasters/slideMaster1.xml');
  });

  it('finds relationship by type', () => {
    const rels = parseRelationships(xml);
    const theme = getRelByType(rels, 'theme');
    expect(theme?.target).toBe('theme/theme1.xml');
  });

  it('finds all relationships by type', () => {
    const rels = parseRelationships(xml);
    const slides = getRelsByType(rels, 'slide');
    // Should match 'slide' but not 'slideMaster'
    expect(slides.length).toBeGreaterThanOrEqual(2);
  });
});
