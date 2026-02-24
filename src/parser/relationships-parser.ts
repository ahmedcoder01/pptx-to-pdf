import { parseXml } from './xml-parser';
import { ensureArray } from '../utils/xml-utils';

export interface Relationship {
  id: string;
  type: string;
  target: string;
}

/**
 * Parse a .rels XML file into a map of relationship ID → Relationship.
 */
export function parseRelationships(xml: string): Map<string, Relationship> {
  const parsed = parseXml(xml);
  const map = new Map<string, Relationship>();

  const rels = parsed?.Relationships;
  if (!rels) return map;

  const items = ensureArray(rels.Relationship);
  for (const item of items) {
    if (!item) continue;
    const id = item['@_Id'];
    const type = item['@_Type'] || '';
    const target = item['@_Target'] || '';

    if (id) {
      map.set(id, {
        id,
        type: type.split('/').pop() || type,
        target,
      });
    }
  }

  return map;
}

/** Get relationship by type suffix (e.g. 'slide', 'slideLayout', 'slideMaster', 'theme', 'image') */
export function getRelByType(rels: Map<string, Relationship>, typeSuffix: string): Relationship | undefined {
  for (const rel of rels.values()) {
    if (rel.type.toLowerCase().includes(typeSuffix.toLowerCase())) {
      return rel;
    }
  }
  return undefined;
}

/** Get all relationships matching a type suffix */
export function getRelsByType(rels: Map<string, Relationship>, typeSuffix: string): Relationship[] {
  const result: Relationship[] = [];
  for (const rel of rels.values()) {
    if (rel.type.toLowerCase().includes(typeSuffix.toLowerCase())) {
      result.push(rel);
    }
  }
  return result;
}
