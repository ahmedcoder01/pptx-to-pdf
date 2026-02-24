import JSZip from 'jszip';
import * as path from 'path';
import { parseRelationships, Relationship } from './relationships-parser';

/**
 * PPTX archive wrapper: extracts ZIP, provides access to parts and relationships.
 */
export class PptxArchive {
  private zip: JSZip;
  private relsCache = new Map<string, Map<string, Relationship>>();

  private constructor(zip: JSZip) {
    this.zip = zip;
  }

  static async load(buffer: Buffer | Uint8Array): Promise<PptxArchive> {
    const zip = await JSZip.loadAsync(buffer);
    return new PptxArchive(zip);
  }

  /** Get XML content of a part by path */
  async getXml(partPath: string): Promise<string | null> {
    const normalizedPath = partPath.replace(/^\//, '');
    const file = this.zip.file(normalizedPath);
    if (!file) return null;
    return file.async('string');
  }

  /** Get binary content of a part */
  async getBinary(partPath: string): Promise<Buffer | null> {
    const normalizedPath = partPath.replace(/^\//, '');
    const file = this.zip.file(normalizedPath);
    if (!file) return null;
    const data = await file.async('nodebuffer');
    return data;
  }

  /** Get relationships for a given part */
  async getRels(partPath: string): Promise<Map<string, Relationship>> {
    const normalizedPath = partPath.replace(/^\//, '');
    if (this.relsCache.has(normalizedPath)) {
      return this.relsCache.get(normalizedPath)!;
    }

    const dir = path.posix.dirname(normalizedPath);
    const base = path.posix.basename(normalizedPath);
    const relsPath = dir ? `${dir}/_rels/${base}.rels` : `_rels/${base}.rels`;

    const xml = await this.getXml(relsPath);
    const rels = xml ? parseRelationships(xml) : new Map<string, Relationship>();

    this.relsCache.set(normalizedPath, rels);
    return rels;
  }

  /** Resolve a relative target from a source part */
  resolveTarget(sourcePart: string, relativeTarget: string): string {
    const dir = path.posix.dirname(sourcePart.replace(/^\//, ''));
    return path.posix.normalize(`${dir}/${relativeTarget}`).replace(/^\//, '');
  }

  /** List all files in the archive */
  listFiles(): string[] {
    const files: string[] = [];
    this.zip.forEach((relativePath) => {
      files.push(relativePath);
    });
    return files;
  }
}
