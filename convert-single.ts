import * as fs from 'fs';
import { convert } from './src/index';

const input = process.argv[2];
const slideIdx = parseInt(process.argv[3] || '0', 10);
const output = process.argv[4] || `slide-${slideIdx}.pdf`;

if (!input) {
  console.error('Usage: npx tsx convert-single.ts <input.pptx> <slide-index> [output.pdf]');
  process.exit(1);
}

async function main() {
  const pptxBuffer = fs.readFileSync(input);
  const pdfBuffer = await convert(pptxBuffer, {
    slides: [slideIdx],
    onWarning: (msg) => console.log(`  WARN: ${msg}`),
  });
  fs.writeFileSync(output, pdfBuffer);
  console.log(`Slide ${slideIdx} → ${output} (${pdfBuffer.length} bytes)`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
