import { RunProperties, ParagraphProperties } from '../types/text';

/**
 * Merge run properties: child overrides parent.
 */
export function mergeRunProperties(parent: RunProperties, child: RunProperties): RunProperties {
  return {
    fontFamily: child.fontFamily ?? parent.fontFamily,
    fontSize: child.fontSize ?? parent.fontSize,
    bold: child.bold ?? parent.bold,
    italic: child.italic ?? parent.italic,
    underline: child.underline ?? parent.underline,
    strikethrough: child.strikethrough ?? parent.strikethrough,
    color: child.color ?? parent.color,
    resolvedColor: child.resolvedColor ?? parent.resolvedColor,
    baseline: child.baseline ?? parent.baseline,
    spacing: child.spacing ?? parent.spacing,
    lang: child.lang ?? parent.lang,
  };
}

/**
 * Merge paragraph properties: child overrides parent.
 */
export function mergeParagraphProperties(
  parent: ParagraphProperties,
  child: ParagraphProperties
): ParagraphProperties {
  return {
    alignment: child.alignment ?? parent.alignment,
    level: child.level ?? parent.level,
    indent: child.indent ?? parent.indent,
    marginLeft: child.marginLeft ?? parent.marginLeft,
    lineSpacing: child.lineSpacing ?? parent.lineSpacing,
    spaceBefore: child.spaceBefore ?? parent.spaceBefore,
    spaceAfter: child.spaceAfter ?? parent.spaceAfter,
    bullet: child.bullet ?? parent.bullet,
    defaultRunProps: child.defaultRunProps && parent.defaultRunProps
      ? mergeRunProperties(parent.defaultRunProps, child.defaultRunProps)
      : child.defaultRunProps ?? parent.defaultRunProps,
  };
}
