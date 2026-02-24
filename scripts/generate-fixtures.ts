import PptxGenJS from 'pptxgenjs';
import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname, '..', 'tests', 'fixtures');

async function generateFixtures() {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });

  // 1. Basic text slide
  await generateBasicText();

  // 2. Shapes slide
  await generateShapes();

  // 3. Image slide
  await generateWithImage();

  // 4. Multi-slide presentation
  await generateMultiSlide();

  console.log('Fixtures generated successfully!');
}

async function generateBasicText() {
  const pptx = new PptxGenJS();

  const slide = pptx.addSlide();
  slide.addText('Hello World', {
    x: 1,
    y: 0.5,
    w: 8,
    h: 1.5,
    fontSize: 36,
    bold: true,
    color: '363636',
    align: 'center',
  });

  slide.addText('This is a subtitle with regular text', {
    x: 1,
    y: 2.5,
    w: 8,
    h: 1,
    fontSize: 18,
    color: '666666',
    align: 'center',
  });

  slide.addText(
    [
      { text: 'Bold ', options: { bold: true, fontSize: 14 } },
      { text: 'Italic ', options: { italic: true, fontSize: 14 } },
      { text: 'Normal', options: { fontSize: 14 } },
    ],
    { x: 1, y: 4, w: 8, h: 0.5, align: 'left' }
  );

  const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
  fs.writeFileSync(path.join(FIXTURES_DIR, 'basic-text.pptx'), buffer);
}

async function generateShapes() {
  const pptx = new PptxGenJS();

  const slide = pptx.addSlide();

  // Rectangle
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.5,
    y: 0.5,
    w: 2,
    h: 1.5,
    fill: { color: '4472C4' },
    line: { color: '2F5496', width: 2 },
  });

  // Rounded rectangle
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 3,
    y: 0.5,
    w: 2,
    h: 1.5,
    fill: { color: 'ED7D31' },
    rectRadius: 0.2,
  });

  // Ellipse
  slide.addShape(pptx.ShapeType.ellipse, {
    x: 5.5,
    y: 0.5,
    w: 2,
    h: 1.5,
    fill: { color: '70AD47' },
  });

  // Triangle
  slide.addShape(pptx.ShapeType.triangle, {
    x: 0.5,
    y: 2.5,
    w: 2,
    h: 1.5,
    fill: { color: 'FFC000' },
  });

  // Diamond
  slide.addShape(pptx.ShapeType.diamond, {
    x: 3,
    y: 2.5,
    w: 2,
    h: 1.5,
    fill: { color: '5B9BD5' },
  });

  // Right arrow
  slide.addShape(pptx.ShapeType.rightArrow, {
    x: 5.5,
    y: 2.5,
    w: 2,
    h: 1.5,
    fill: { color: 'A5A5A5' },
  });

  // Line
  slide.addShape(pptx.ShapeType.line, {
    x: 0.5,
    y: 4.5,
    w: 9,
    h: 0,
    line: { color: '000000', width: 2 },
  });

  const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
  fs.writeFileSync(path.join(FIXTURES_DIR, 'shapes.pptx'), buffer);
}

async function generateWithImage() {
  const pptx = new PptxGenJS();

  const slide = pptx.addSlide();
  slide.addText('Slide with Image', {
    x: 1,
    y: 0.3,
    w: 8,
    h: 1,
    fontSize: 24,
    bold: true,
    align: 'center',
  });

  // Create a simple 2x2 PNG in-memory (red square)
  // PNG header + minimal IHDR + IDAT + IEND
  const pngBuffer = createMinimalPng();

  slide.addImage({
    data: `data:image/png;base64,${pngBuffer.toString('base64')}`,
    x: 3,
    y: 2,
    w: 4,
    h: 3,
  });

  const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
  fs.writeFileSync(path.join(FIXTURES_DIR, 'with-image.pptx'), buffer);
}

async function generateMultiSlide() {
  const pptx = new PptxGenJS();

  for (let i = 0; i < 3; i++) {
    const slide = pptx.addSlide();
    slide.background = { color: i === 0 ? 'FFFFFF' : i === 1 ? 'F0F0F0' : 'E0E8F0' };
    slide.addText(`Slide ${i + 1}`, {
      x: 1,
      y: 2.5,
      w: 8,
      h: 2,
      fontSize: 48,
      bold: true,
      align: 'center',
      color: '333333',
    });
  }

  const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
  fs.writeFileSync(path.join(FIXTURES_DIR, 'multi-slide.pptx'), buffer);
}

/** Create a minimal valid 1x1 red pixel PNG */
function createMinimalPng(): Buffer {
  // Use a minimal hand-crafted PNG
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk: 1x1, 8-bit RGB
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(1, 0); // width
  ihdrData.writeUInt32BE(1, 4); // height
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = createPngChunk('IHDR', ihdrData);

  // IDAT chunk: compressed pixel data (filter byte 0 + RGB)
  // zlib-compressed: [0x78, 0x01] deflate header, then data, then checksum
  const idatCompressed = Buffer.from([
    0x78, 0x01, 0x62, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x00, 0x04, 0x00, 0x01
  ]);
  const idat = createPngChunk('IDAT', idatCompressed);

  // IEND chunk
  const iend = createPngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createPngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuffer, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

generateFixtures().catch(console.error);
