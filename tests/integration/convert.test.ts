import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { convert } from '../../src/index';

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

// Check if fixtures exist; if not, generate them
async function ensureFixtures() {
  if (!fs.existsSync(path.join(FIXTURES_DIR, 'basic-text.pptx'))) {
    // Generate fixtures dynamically
    const PptxGenJS = (await import('pptxgenjs')).default;

    fs.mkdirSync(FIXTURES_DIR, { recursive: true });

    // Basic text fixture
    const pptx = new PptxGenJS();
    const slide = pptx.addSlide();
    slide.addText('Hello World', {
      x: 1, y: 0.5, w: 8, h: 1.5,
      fontSize: 36, bold: true, color: '363636', align: 'center',
    });
    slide.addText('Subtitle text', {
      x: 1, y: 2.5, w: 8, h: 1,
      fontSize: 18, color: '666666', align: 'center',
    });
    const buf1 = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
    fs.writeFileSync(path.join(FIXTURES_DIR, 'basic-text.pptx'), buf1);

    // Shapes fixture
    const pptx2 = new PptxGenJS();
    const slide2 = pptx2.addSlide();
    slide2.addShape(pptx2.ShapeType.rect, {
      x: 0.5, y: 0.5, w: 2, h: 1.5,
      fill: { color: '4472C4' },
    });
    slide2.addShape(pptx2.ShapeType.ellipse, {
      x: 3, y: 0.5, w: 2, h: 1.5,
      fill: { color: '70AD47' },
    });
    const buf2 = await pptx2.write({ outputType: 'nodebuffer' }) as Buffer;
    fs.writeFileSync(path.join(FIXTURES_DIR, 'shapes.pptx'), buf2);

    // Multi-slide fixture
    const pptx3 = new PptxGenJS();
    for (let i = 0; i < 3; i++) {
      const s = pptx3.addSlide();
      s.addText(`Slide ${i + 1}`, {
        x: 1, y: 2.5, w: 8, h: 2,
        fontSize: 48, bold: true, align: 'center', color: '333333',
      });
    }
    const buf3 = await pptx3.write({ outputType: 'nodebuffer' }) as Buffer;
    fs.writeFileSync(path.join(FIXTURES_DIR, 'multi-slide.pptx'), buf3);
  }
}

describe('PPTX to PDF conversion', () => {
  beforeAll(async () => {
    await ensureFixtures();
  });

  it('converts a basic text PPTX to PDF', async () => {
    const pptxBuffer = fs.readFileSync(path.join(FIXTURES_DIR, 'basic-text.pptx'));
    const warnings: string[] = [];

    const pdfBuffer = await convert(pptxBuffer, {
      onWarning: (msg) => warnings.push(msg),
    });

    // Verify it's a valid PDF
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');

    // Check PDF ends properly
    const tail = pdfBuffer.subarray(pdfBuffer.length - 6).toString().trim();
    expect(tail).toBe('%%EOF');
  });

  it('converts a shapes PPTX to PDF', async () => {
    const pptxBuffer = fs.readFileSync(path.join(FIXTURES_DIR, 'shapes.pptx'));
    const pdfBuffer = await convert(pptxBuffer);

    expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdfBuffer.length).toBeGreaterThan(100);
  });

  it('converts a multi-slide PPTX to PDF', async () => {
    const pptxBuffer = fs.readFileSync(path.join(FIXTURES_DIR, 'multi-slide.pptx'));
    const pdfBuffer = await convert(pptxBuffer);

    expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');
    // Multi-page PDF should be larger
    expect(pdfBuffer.length).toBeGreaterThan(500);
  });

  it('supports selecting specific slides', async () => {
    const pptxBuffer = fs.readFileSync(path.join(FIXTURES_DIR, 'multi-slide.pptx'));

    const allSlides = await convert(pptxBuffer);
    const oneSlide = await convert(pptxBuffer, { slides: [0] });

    // Single slide PDF should be smaller
    expect(oneSlide.length).toBeLessThan(allSlides.length);
  });

  it('throws on invalid input', async () => {
    await expect(convert(Buffer.from('not a pptx'))).rejects.toThrow();
  });

  it('throws on empty PPTX without slides', async () => {
    // A valid ZIP but not a PPTX
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    zip.file('dummy.txt', 'hello');
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });

    await expect(convert(buffer)).rejects.toThrow();
  });
});
