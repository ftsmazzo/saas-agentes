import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await build({
  entryPoints: ['server/_core/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/index.js',
  packages: 'external',
  alias: {
    '@shared/const': resolve(__dirname, 'shared/const.ts'),
    '@shared/_core/errors': resolve(__dirname, 'shared/_core/errors.ts'),
  },
  logLevel: 'info',
}).catch(() => {
  process.exit(1);
});

