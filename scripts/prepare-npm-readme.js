import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const fullReadme = path.join(rootDir, 'README.md');
const npmReadme = path.join(rootDir, 'README.npm.md');
const backupReadme = path.join(rootDir, '.github-readme-backup.tmp');

if (fs.existsSync(npmReadme) && fs.existsSync(fullReadme)) {
  fs.copyFileSync(fullReadme, backupReadme);
  fs.copyFileSync(npmReadme, fullReadme);
  console.log('[paramsync] Prepared concise README.npm.md for NPM package.');
}
