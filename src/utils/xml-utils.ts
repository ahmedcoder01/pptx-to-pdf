/**
 * Safe access helpers for parsed OOXML structures.
 * fast-xml-parser produces objects where attributes are prefixed with '@_'
 * and child arrays may be a single object or an array.
 */

/** Get an attribute value from a parsed XML node */
export function attr(node: any, name: string): string | undefined {
  if (!node) return undefined;
  return node[`@_${name}`] ?? node[name];
}

/** Get a numeric attribute */
export function numAttr(node: any, name: string): number | undefined {
  const val = attr(node, name);
  if (val === undefined) return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : num;
}

/** Get a boolean attribute */
export function boolAttr(node: any, name: string): boolean | undefined {
  const val = attr(node, name);
  if (val === undefined) return undefined;
  return val === '1' || val === 'true';
}

/** Ensure a value is an array (fast-xml-parser returns a single object for one child) */
export function ensureArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}

/** Get a child element by local name, handling namespace prefixes */
export function child(node: any, localName: string): any {
  if (!node) return undefined;
  // Try without prefix first
  if (node[localName] !== undefined) return node[localName];
  // Try common OOXML prefixes
  for (const prefix of ['a:', 'p:', 'r:', 'c:', 'dgm:']) {
    if (node[`${prefix}${localName}`] !== undefined) {
      return node[`${prefix}${localName}`];
    }
  }
  return undefined;
}

/** Get all children matching a local name */
export function children(node: any, localName: string): any[] {
  return ensureArray(child(node, localName));
}

/** Deep get a nested child path like 'spPr.xfrm.off' */
export function deepChild(node: any, path: string): any {
  const parts = path.split('.');
  let current = node;
  for (const part of parts) {
    if (!current) return undefined;
    current = child(current, part);
  }
  return current;
}

/** Get text content of a node */
export function textContent(node: any): string {
  if (node === undefined || node === null) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (node['#text'] !== undefined) return String(node['#text']);
  return '';
}
