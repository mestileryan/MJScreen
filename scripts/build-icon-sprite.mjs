// scripts/build-icon-sprite.mjs
import { promises as fs } from 'fs';
import path from 'path';
import fg from 'fast-glob';
import svgstore from 'svgstore';
import { optimize } from 'svgo';

const iconsDir  = path.resolve('src/assets/game-icons');
const outSprite = path.resolve('src/assets/icon-sprite.svg');
const listFile  = path.resolve('src/assets/icon-list.json');

(async () => {
  const store = svgstore({ inline: true });
  const icons = await fg('**/*.svg', { cwd: iconsDir });
  const iconNames = [];

  for (const iconPath of icons) {
    const fullPath = path.join(iconsDir, iconPath);
    const svgContent = await fs.readFile(fullPath, 'utf8');
    const { data } = optimize(svgContent, { path: fullPath });

    const id = path.basename(iconPath, '.svg');
    store.add(id, data);
    iconNames.push(id);
  }

  await fs.writeFile(outSprite, store.toString());
  await fs.writeFile(listFile, JSON.stringify(iconNames, null, 2));

  console.log(`Sprite créée avec ${icons.length} icônes.`);
})();
