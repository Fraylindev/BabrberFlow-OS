const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../../..'),
  temp = path.join(root, '.tmp/m3-compat');
fs.mkdirSync(temp, { recursive: true });
function run(exe, args, cwd = root, shell = false) {
  const result = spawnSync(exe, args, {
    cwd,
    env: process.env,
    encoding: 'utf8',
    windowsHide: true,
    shell,
    timeout: 180000,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0)
    throw new Error(
      'Compatibility preparation failed: ' + exe + ' exit=' + result.status,
    );
  return result.stdout.trim();
}
const manifest = [];
for (const ref of ['8e1501e', 'b318ca5', '523d993']) {
  const dir = path.join(temp, ref);
  fs.mkdirSync(dir, { recursive: true });
  const archive = path.join(dir, 'source.tar');
  const source =
    ref === '523d993'
      ? ['apps/web/lib']
      : [
          'package.json',
          'pnpm-lock.yaml',
          'pnpm-workspace.yaml',
          'apps/api',
          'apps/web/lib',
        ];
  run('git', [
    'archive',
    '--format=tar',
    '--output=' + archive,
    ref,
    ...source,
  ]);
  run('tar', ['-xf', archive, '-C', dir]);
  const entry = {
    ref,
    sha: run('git', ['rev-parse', ref]),
    archiveSha256: createHash('sha256')
      .update(fs.readFileSync(archive))
      .digest('hex'),
  };
  if (ref !== '523d993') {
    for (const [link, target] of [
      [path.join(dir, 'node_modules'), path.join(root, 'node_modules')],
      [
        path.join(dir, 'apps/api/node_modules'),
        path.join(root, 'apps/api/node_modules'),
      ],
    ])
      if (!fs.existsSync(link)) fs.symlinkSync(target, link, 'junction');
    run(
      'pnpm.cmd',
      [
        '--config.verify-deps-before-run=false',
        '--dir',
        path.join(dir, 'apps/api'),
        'build',
      ],
      root,
      true,
    );
    entry.buildExitCode = 0;
    entry.schemaSha256 = createHash('sha256')
      .update(
        fs
          .readFileSync(path.join(dir, 'apps/api/prisma/schema.prisma'))
          .toString()
          .replaceAll('\r\n', '\n'),
      )
      .digest('hex');
    const names = fs
      .readdirSync(path.join(dir, 'apps/api/prisma/migrations'))
      .filter((name) =>
        fs.existsSync(
          path.join(dir, 'apps/api/prisma/migrations', name, 'migration.sql'),
        ),
      )
      .sort();
    entry.migrations = names.map((name) => ({
      name,
      sha256: createHash('sha256')
        .update(
          fs
            .readFileSync(
              path.join(
                dir,
                'apps/api/prisma/migrations',
                name,
                'migration.sql',
              ),
            )
            .toString()
            .replaceAll('\r\n', '\n'),
        )
        .digest('hex'),
    }));
  }
  manifest.push(entry);
}
fs.writeFileSync(
  path.join(temp, 'manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    sourceBuildsOnly: true,
    manifest: manifest.map(({ ref, sha, buildExitCode, schemaSha256 }) => ({
      ref,
      sha,
      buildExitCode,
      schemaSha256,
    })),
  }),
);
