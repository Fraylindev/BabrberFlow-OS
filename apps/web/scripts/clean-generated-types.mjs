import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const webRootUrl = new URL('../', import.meta.url);
const webRoot = fileURLToPath(webRootUrl);

// Solo elimina tipos generados por Next. No toca fuentes ni otros artefactos.
for (const relativePath of ['.next/types', '.next/dev/types']) {
  rmSync(fileURLToPath(new URL(`${relativePath}/`, webRootUrl)), {
    recursive: true,
    force: true,
  });
}

console.log(`Generated Next.js types cleaned under ${webRoot}`);
