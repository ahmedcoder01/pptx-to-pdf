import { describe, it, expect } from 'vitest';
import { parseTheme } from '../../src/parser/theme-parser';

describe('theme parser', () => {
  it('parses theme color scheme', () => {
    const xml = `<?xml version="1.0"?>
    <a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
      <a:themeElements>
        <a:clrScheme name="Office">
          <a:dk1><a:srgbClr val="000000"/></a:dk1>
          <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
          <a:dk2><a:srgbClr val="44546A"/></a:dk2>
          <a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
          <a:accent1><a:srgbClr val="4472C4"/></a:accent1>
          <a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
          <a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>
          <a:accent4><a:srgbClr val="FFC000"/></a:accent4>
          <a:accent5><a:srgbClr val="5B9BD5"/></a:accent5>
          <a:accent6><a:srgbClr val="70AD47"/></a:accent6>
          <a:hlink><a:srgbClr val="0563C1"/></a:hlink>
          <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
        </a:clrScheme>
        <a:fontScheme name="Office">
          <a:majorFont><a:latin typeface="Calibri Light"/></a:majorFont>
          <a:minorFont><a:latin typeface="Calibri"/></a:minorFont>
        </a:fontScheme>
      </a:themeElements>
    </a:theme>`;

    const theme = parseTheme(xml);

    expect(theme.colorScheme.dk1).toBe('000000');
    expect(theme.colorScheme.lt1).toBe('FFFFFF');
    expect(theme.colorScheme.accent1).toBe('4472C4');
    expect(theme.colorScheme.accent6).toBe('70AD47');
    expect(theme.colorScheme.hlink).toBe('0563C1');

    expect(theme.fontScheme.majorLatin).toBe('Calibri Light');
    expect(theme.fontScheme.minorLatin).toBe('Calibri');
  });

  it('handles system colors (sysClr)', () => {
    const xml = `<?xml version="1.0"?>
    <a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <a:themeElements>
        <a:clrScheme name="Office">
          <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
          <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
          <a:dk2><a:srgbClr val="44546A"/></a:dk2>
          <a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
          <a:accent1><a:srgbClr val="4472C4"/></a:accent1>
          <a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
          <a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>
          <a:accent4><a:srgbClr val="FFC000"/></a:accent4>
          <a:accent5><a:srgbClr val="5B9BD5"/></a:accent5>
          <a:accent6><a:srgbClr val="70AD47"/></a:accent6>
          <a:hlink><a:srgbClr val="0563C1"/></a:hlink>
          <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
        </a:clrScheme>
        <a:fontScheme name="Office">
          <a:majorFont><a:latin typeface="Calibri Light"/></a:majorFont>
          <a:minorFont><a:latin typeface="Calibri"/></a:minorFont>
        </a:fontScheme>
      </a:themeElements>
    </a:theme>`;

    const theme = parseTheme(xml);
    expect(theme.colorScheme.dk1).toBe('000000');
    expect(theme.colorScheme.lt1).toBe('FFFFFF');
  });

  it('returns defaults for invalid XML', () => {
    const theme = parseTheme('<invalid/>');
    expect(theme.colorScheme.dk1).toBe('000000');
    expect(theme.fontScheme.majorLatin).toBe('Calibri Light');
  });
});
