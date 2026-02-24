import { describe, it, expect } from 'vitest';
import { parseXml } from '../../src/parser/xml-parser';

describe('XML parser', () => {
  it('parses simple OOXML', () => {
    const xml = `<?xml version="1.0"?>
    <p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <p:sldSz cx="9144000" cy="6858000"/>
      <p:sldIdLst>
        <p:sldId id="256" r:id="rId2"/>
      </p:sldIdLst>
    </p:presentation>`;

    const result = parseXml(xml);
    expect(result['p:presentation']).toBeDefined();
    expect(result['p:presentation']['p:sldSz']['@_cx']).toBe('9144000');
  });

  it('parses relationships', () => {
    const xml = `<?xml version="1.0"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
      <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
    </Relationships>`;

    const result = parseXml(xml);
    expect(result.Relationships.Relationship).toHaveLength(2);
    expect(result.Relationships.Relationship[0]['@_Id']).toBe('rId1');
  });

  it('preserves namespace prefixes', () => {
    const xml = `<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <a:themeElements>
        <a:clrScheme name="Office">
          <a:dk1><a:srgbClr val="000000"/></a:dk1>
        </a:clrScheme>
      </a:themeElements>
    </a:theme>`;

    const result = parseXml(xml);
    expect(result['a:theme']).toBeDefined();
    expect(result['a:theme']['a:themeElements']).toBeDefined();
  });
});
