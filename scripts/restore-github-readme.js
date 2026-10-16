import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const fullReadme = path.join(rootDir, 'README.md');
const backupReadme = path.join(rootDir, '.github-readme-backup.tmp');

if (fs.existsSync(backupReadme)) {
  fs.copyFileSync(backupReadme, fullReadme);
  fs.unlinkSync(backupReadme);
  console.log('[paramsync] Restored comprehensive README.md for GitHub.');
}
