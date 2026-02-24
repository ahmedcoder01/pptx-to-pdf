import { PptxArchive } from './src/parser/pptx-archive';
import { parsePresentation } from './src/parser/presentation-parser';
import { parseXml } from './src/parser/xml-parser';
import { getRelByType, getRelsByType } from './src/parser/relationships-parser';
import { child, ensureArray, attr, numAttr } from './src/utils/xml-utils';
import * as fs from 'fs';

async function main() {
  const buf = fs.readFileSync('Healthcare-Training-ReservoirsTK-S2-Slides-508.pptx');
  const archive = await PptxArchive.load(buf);

  // Check slide master background
  const masterXml = await archive.getXml('ppt/slideMasters/slideMaster1.xml');
  const masterParsed = parseXml(masterXml!);
  const masterEl = masterParsed['p:sldMaster'];
  const masterCSld = child(masterEl, 'cSld');
  const masterBg = child(masterCSld, 'bg');
  console.log('=== Slide Master ===');
  console.log('Has background:', !!masterBg);
  if (masterBg) {
    console.log('  bgPr:', !!child(masterBg, 'bgPr'));
    console.log('  bgRef:', !!child(masterBg, 'bgRef'));
    const bgPr = child(masterBg, 'bgPr');
    if (bgPr) {
      console.log('  solidFill:', !!child(bgPr, 'solidFill'));
      console.log('  blipFill:', !!child(bgPr, 'blipFill'));
      console.log('  gradFill:', !!child(bgPr, 'gradFill'));
    }
  }

  // Check master rels
  const masterRels = await archive.getRels('ppt/slideMasters/slideMaster1.xml');
  const masterImageRels = getRelsByType(masterRels, 'image');
  console.log('Master image rels:', masterImageRels.length);
  masterImageRels.forEach(r => console.log('  ', r.id, '->', r.target));

  // Master shape tree
  const masterSpTree = child(masterCSld, 'spTree');
  const masterSps = ensureArray(child(masterSpTree, 'sp'));
  const masterPics = ensureArray(child(masterSpTree, 'pic'));
  console.log('Master shapes:', masterSps.length, 'pics:', masterPics.length);

  // Check each slide layout
  console.log('\n=== Slide Layouts ===');
  for (let i = 1; i <= 11; i++) {
    const layoutPath = `ppt/slideLayouts/slideLayout${i}.xml`;
    const layoutXml = await archive.getXml(layoutPath);
    if (!layoutXml) continue;
    const layoutParsed = parseXml(layoutXml);
    const layoutEl = layoutParsed['p:sldLayout'];
    const layoutCSld = child(layoutEl, 'cSld');
    const layoutBg = child(layoutCSld, 'bg');
    const layoutSpTree = child(layoutCSld, 'spTree');
    const layoutPics = ensureArray(child(layoutSpTree, 'pic'));
    const layoutSps = ensureArray(child(layoutSpTree, 'sp'));

    const layoutRels = await archive.getRels(layoutPath);
    const layoutImageRels = getRelsByType(layoutRels, 'image');

    const showMaster = attr(layoutEl, 'showMasterSp');

    console.log(`Layout ${i}: bg=${!!layoutBg} shapes=${layoutSps.length} pics=${layoutPics.length} imageRels=${layoutImageRels.length} showMasterSp=${showMaster}`);
    if (layoutBg) {
      const bgPr = child(layoutBg, 'bgPr');
      if (bgPr) {
        const blipFill = child(bgPr, 'blipFill');
        if (blipFill) {
          const blip = child(blipFill, 'blip');
          console.log('  Background image: r:embed=' + attr(blip, 'r:embed'));
        }
        console.log('  solidFill:', !!child(bgPr, 'solidFill'));
        console.log('  gradFill:', !!child(bgPr, 'gradFill'));
      }
    }
    if (layoutImageRels.length > 0) {
      layoutImageRels.forEach(r => console.log('  Image:', r.id, '->', r.target));
    }
  }

  // Now check which layout each slide uses
  console.log('\n=== Slide → Layout mapping ===');
  const presRels = await archive.getRels('ppt/presentation.xml');
  const presXml = await archive.getXml('ppt/presentation.xml');
  const presInfo = parsePresentation(presXml!);

  for (let i = 0; i < Math.min(5, presInfo.slideIds.length); i++) {
    const slideId = presInfo.slideIds[i];
    const slideRel = presRels.get(slideId.rId);
    if (!slideRel) continue;
    const slidePath = archive.resolveTarget('ppt/presentation.xml', slideRel.target);
    const slideRels = await archive.getRels(slidePath);

    const layoutRel = getRelByType(slideRels, 'slideLayout');
    console.log(`Slide ${i}: layout=${layoutRel?.target || 'NONE'}`);

    // Check what elements the slide actually has
    const slideXml = await archive.getXml(slidePath);
    const parsed = parseXml(slideXml!);
    const sldEl = parsed['p:sld'];
    const cSld = child(sldEl, 'cSld');
    const spTree = child(cSld, 'spTree');
    const pics = ensureArray(child(spTree, 'pic'));
    const sps = ensureArray(child(spTree, 'sp'));
    const bg = child(cSld, 'bg');

    // Check for image rels on this slide
    const imgRels = getRelsByType(slideRels, 'image');

    console.log(`  shapes=${sps.length} pics=${pics.length} imgRels=${imgRels.length} bg=${!!bg}`);

    // For pics, check the blip embed
    for (const pic of pics) {
      const blipFill = child(pic, 'blipFill');
      const blip = child(blipFill, 'blip');
      const embed = attr(blip, 'r:embed');
      const rel = slideRels.get(embed || '');
      console.log(`  pic: embed=${embed} -> ${rel?.target || 'NOT FOUND'}`);
    }
  }
}

main().catch(console.error);
