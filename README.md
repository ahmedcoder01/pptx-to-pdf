# pptx-to-pdf

Pure TypeScript PPTX-to-PDF converter. No LibreOffice. No native dependencies. Just buffer in, PDF out.

```
npm install pptx-to-pdf
```

## Usage

```typescript
import { convert } from 'pptx-to-pdf';
import fs from 'fs';

const pptx = fs.readFileSync('presentation.pptx');
const pdf = await convert(pptx);
fs.writeFileSync('output.pdf', pdf);
```

## API

### `convert(pptxBuffer, options?): Promise<Buffer>`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `slides` | `number[]` | all | Slide indices to include (0-based) |
| `fontDirs` | `string[]` | `[]` | Additional directories to search for fonts |
| `fontMap` | `Record<string, string \| Buffer>` | `{}` | Map font names to file paths or buffers |
| `dpi` | `number` | `96` | Output resolution |
| `onWarning` | `(msg: string) => void` | no-op | Callback for non-fatal warnings |

## Examples

### Specific slides only

```typescript
const pdf = await convert(pptx, {
  slides: [0, 2, 4], // first, third, and fifth slides
});
```

### Custom fonts

```typescript
const pdf = await convert(pptx, {
  fontDirs: ['/usr/share/fonts/truetype'],
  fontMap: {
    'Calibri': '/path/to/calibri.ttf',
    'Custom Font': fs.readFileSync('/path/to/custom.ttf'),
  },
});
```

### Express endpoint

```typescript
app.post('/convert', async (req, res) => {
  const pdf = await convert(req.body);
  res.type('application/pdf').send(pdf);
});
```

### AWS Lambda

```typescript
export const handler = async (event) => {
  const pptx = Buffer.from(event.body, 'base64');
  const pdf = await convert(pptx);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/pdf' },
    body: pdf.toString('base64'),
    isBase64Encoded: true,
  };
};
```

## What it handles

- Text with fonts, sizes, colors, bold/italic/underline
- Shapes (rectangles, ellipses, arrows, rounded rects, and more)
- Images (JPEG, PNG) including cropped images
- Tables with cell backgrounds, borders, and text
- Slide backgrounds (solid, gradient, image)
- Theme colors and font schemes
- Placeholder inheritance (slide -> layout -> master)
- Group shapes with nested children
- Connectors

## What it doesn't handle (yet)

- Charts
- SmartArt
- Animations and transitions
- Audio/video
- EMF/WMF vector graphics
- 3D effects and complex text transforms
- Pattern fills

## How it works

The library parses the PPTX file (a ZIP archive of Office Open XML) and renders directly to PDF:

1. **Extract** ZIP archive with `jszip`
2. **Parse** all XML parts with `fast-xml-parser` (presentation, themes, masters, layouts, slides)
3. **Resolve** the full inheritance chain (slide -> layout -> master -> theme) for transforms, fills, and text styles
4. **Measure** text with `opentype.js` for accurate line breaking and layout
5. **Render** to PDF with `pdfkit` (vector paths, embedded images, positioned text)

No intermediate HTML. No headless browser. No subprocess.

## Fonts

The library bundles Liberation Sans, Liberation Serif, and Liberation Mono (~2.5MB) as metric-compatible fallbacks for Arial, Times New Roman, and Courier New. For better fidelity, provide the actual fonts via `fontDirs` or `fontMap`.

## License

MIT
