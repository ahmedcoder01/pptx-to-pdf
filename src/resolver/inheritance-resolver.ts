import { Slide } from '../types/slide';
import { SlideElement, AutoShape } from '../types/shape';
import { TextBody, TextRun, Paragraph, RunProperties } from '../types/text';
import { Theme, ThemeColorScheme, ThemeFontScheme } from '../types/presentation';
import { Fill, SolidFill } from '../types/fill';
import { ResolvedColor, ColorSource } from '../types/color';
import { resolveColor } from './color-resolver';
import { resolveFont } from './font-resolver';
import { mergeRunProperties } from './style-resolver';

/**
 * Resolve all theme references in a slide's elements.
 * This resolves:
 * - schemeClr → concrete RGB
 * - +mj-lt/+mn-lt → concrete font families
 * - Fill placeholders with resolved colors
 * - Text run colors
 */
export function resolveSlide(slide: Slide, theme: Theme): Slide {
  return {
    ...slide,
    elements: slide.elements.map((el) => resolveElement(el, theme)),
    background: slide.background ? resolveFill(slide.background, theme.colorScheme) : undefined,
  };
}

function resolveElement(element: SlideElement, theme: Theme): SlideElement {
  switch (element.type) {
    case 'shape':
      return resolveAutoShape(element, theme);
    case 'picture':
      return element; // Pictures don't need color resolution
    case 'table':
      return {
        ...element,
        rows: element.rows.map((row) => ({
          ...row,
          cells: row.cells.map((cell) => ({
            ...cell,
            fill: cell.fill ? resolveFill(cell.fill, theme.colorScheme) : undefined,
            text: cell.text ? resolveTextBody(cell.text, theme) : undefined,
          })),
        })),
      };
    case 'group':
      return {
        ...element,
        children: element.children.map((child) => resolveElement(child, theme)),
      };
    case 'connector':
      return {
        ...element,
        line: element.line
          ? {
              ...element.line,
              color: element.line.color || { r: 0, g: 0, b: 0, a: 1 },
            }
          : undefined,
      };
    default:
      return element;
  }
}

function resolveAutoShape(shape: AutoShape, theme: Theme): AutoShape {
  return {
    ...shape,
    fill: shape.fill ? resolveFill(shape.fill, theme.colorScheme) : undefined,
    line: shape.line
      ? {
          ...shape.line,
          color: shape.line.color || undefined,
        }
      : undefined,
    textBody: shape.textBody ? resolveTextBody(shape.textBody, theme) : undefined,
  };
}

function resolveFill(fill: Fill, colorScheme: ThemeColorScheme): Fill {
  if (fill.type === 'solid') {
    return fill; // Already resolved during parsing or will be resolved by fill-resolver
  }
  return fill;
}

function resolveTextBody(textBody: TextBody, theme: Theme): TextBody {
  return {
    ...textBody,
    paragraphs: textBody.paragraphs.map((p) => resolveParagraph(p, theme)),
  };
}

function resolveParagraph(paragraph: Paragraph, theme: Theme): Paragraph {
  return {
    ...paragraph,
    runs: paragraph.runs.map((run) => resolveTextRun(run, theme)),
    properties: {
      ...paragraph.properties,
      defaultRunProps: paragraph.properties.defaultRunProps
        ? resolveRunProps(paragraph.properties.defaultRunProps, theme)
        : undefined,
    },
  };
}

function resolveTextRun(run: TextRun, theme: Theme): TextRun {
  return {
    ...run,
    properties: resolveRunProps(run.properties, theme),
  };
}

function resolveRunProps(props: RunProperties, theme: Theme): RunProperties {
  const resolved = { ...props };

  // Resolve font
  if (resolved.fontFamily) {
    resolved.fontFamily = resolveFont(resolved.fontFamily, theme.fontScheme);
  }

  // Resolve color
  if (resolved.color) {
    resolved.resolvedColor = resolveColor(resolved.color, theme.colorScheme);
  }

  return resolved;
}
