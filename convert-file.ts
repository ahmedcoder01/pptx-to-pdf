import * as fs from 'fs';
import * as path from 'path';
import { convert } from './src/index';

const input = process.argv[2];
if (!input) {
  console.error('Usage: npx tsx convert-file.ts <input.pptx> [output.pdf]');
  process.exit(1);
}

const output = process.argv[3] || input.replace(/\.pptx$/i, '.pdf');

async function main() {
  const pptxBuffer = fs.readFileSync(input);
  console.log(`Input: ${input} (${pptxBuffer.length} bytes)`);

  const pdfBuffer = await convert(pptxBuffer, {
    onWarning: (msg) => console.log(`  WARN: ${msg}`),
  });

  fs.writeFileSync(output, pdfBuffer);
  console.log(`Output: ${output} (${pdfBuffer.length} bytes)`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
