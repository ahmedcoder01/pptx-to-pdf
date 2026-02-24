import { XMLParser } from 'fast-xml-parser';

/**
 * Configured XML parser for Office Open XML documents.
 * - Preserves namespace prefixes (a:, p:, r:)
 * - Parses attributes with '@_' prefix
 * - Handles text content
 */
const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  preserveOrder: false,
  parseAttributeValue: false, // keep as strings
  trimValues: true,
  isArray: (name: string) => {
    // Force arrays for elements that can repeat
    const arrayElements = [
      'p:sldId',
      'p:sp',
      'p:pic',
      'p:grpSp',
      'p:graphicFrame',
      'p:cxnSp',
      'a:r',
      'a:br',
      'a:p',
      'a:gs',
      'a:lin',
      'a:path',
      'a:moveTo',
      'a:lnTo',
      'a:cubicBezTo',
      'a:arcTo',
      'a:close',
      'a:pt',
      'a:gridCol',
      'a:tr',
      'a:tc',
      'a:tbl',
      'Relationship',
    ];
    return arrayElements.includes(name);
  },
};

const parser = new XMLParser(parserOptions);

export function parseXml(xml: string): any {
  return parser.parse(xml);
}
