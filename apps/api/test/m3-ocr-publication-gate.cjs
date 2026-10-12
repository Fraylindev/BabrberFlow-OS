// Publication candidate tree gate. Historical commits are preserved, never rewritten.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const exclusions = JSON.parse(fs.readFileSync(path.join(root, 'docs/quality/M3_OCR_PUBLICACION_EXCLUSIONES.json'), 'utf8')).paths;
const ref = process.argv[2] || 'HEAD';
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const bannedPaths = new Set(exclusions.map(x => x.path));
const bannedBlobs = new Set(exclusions.map(x => x.blob));
let entries;
if (ref === '--worktree') {
  entries = git(['ls-files', '-z']).split('\0').filter(Boolean).filter(p => fs.existsSync(path.join(root, p))).map(p => {
    const bytes = fs.readFileSync(path.join(root, p));
    const blob = createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
    return { path: p, blob };
  });
} else {
  // Resolve a single commit first; never interpret a candidate ref as shell code.
  const commit = git(['rev-parse', '--verify', `${ref}^{commit}`]).trim();
  entries = git(['ls-tree', '-rz', commit]).split('\0').filter(Boolean).map(row => {
    const [meta, p] = row.split('\t'); return { path: p, blob: meta.split(' ')[2] };
  });
}
const found = entries.filter(x => bannedPaths.has(x.path) || bannedBlobs.has(x.blob));
console.log(JSON.stringify({ candidate: ref, exclusions: exclusions.length, rejected: found.length, paths: found.map(x => x.path), historyRewritten: false }));
if (found.length) process.exitCode = 1;
