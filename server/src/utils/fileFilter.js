// const path = require('path');
import path from 'path';
const IGNORED_DIRS = new Set([
  'node_modules', 'docs', '.github', '.gitlab-ci.yml', '.husky', '.vscode', '.idea',
  'dist', 'build', 'out', 'target', 'coverage', '__tests__', 'tests',
  'public', 'assets', 'images', 'fonts', 'icons', 'helm', 'terraform', 'config'
]);

const IGNORED_FILES = new Set([
  'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'LICENSE',
  '.gitignore', '.gitattributes', '.gitlab-ci.yml', '.prettierrc', '.prettierignore',
  '.editorconfig', '.lintstagedrc', 'bundle.js', 'Dockerfile', 'docker-compose.yml',
  'vercel.json', 'netlify.toml', 'nginx.conf', '.env.example',
  'pyproject.toml', 'requirements.txt', 'pom.xml', 'go.mod', 'next.config.js',
  'vite.config.js', 'webpack.config.js', 'tsconfig.json', 'settings.py',
  'application.yml', 'firebase.json', '.env', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'
]);

const IGNORED_EXTENSIONS = new Set([
  '.md', '.iml', '.swp', '.suo', '.png', '.jpg', '.svg', '.mp4'
]);

export const isFileAllowed = (entryName) => {
  const fileName = path.basename(entryName);
  
  // Check strict directory exclusions (if path contains these folders)
  const parts = entryName.split(/[/\\]/);
  for (const part of parts) {
    if (IGNORED_DIRS.has(part)) return false;
  }

  // Check exact filenames
  if (IGNORED_FILES.has(fileName)) return false;

  // Check extensions
  const ext = path.extname(fileName).toLowerCase();
  if (IGNORED_EXTENSIONS.has(ext)) return false;

  // Check wildcard/pattern matches
  if (fileName.startsWith('.eslintrc') || fileName.startsWith('.stylelintrc')) return false;
  if (fileName.endsWith('.min.js') || fileName.endsWith('.spec.js') || fileName.endsWith('.test.ts') || fileName.endsWith('.test.js')) return false;
  if (fileName.startsWith('app.config.')) return false;

  return true;
};