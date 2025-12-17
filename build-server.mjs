import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve, extname } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ler tsconfig.json para pegar os paths (se existir)
let paths = {};
try {
  const tsconfig = JSON.parse(readFileSync(resolve(__dirname, 'tsconfig.json'), 'utf-8'));
  paths = tsconfig.compilerOptions?.paths || {};
} catch (error) {
  console.warn('⚠️  tsconfig.json não encontrado, usando aliases padrão');
}

// Criar plugin para resolver aliases
const aliasPlugin = {
  name: 'alias',
  setup(build) {
    // Resolver @shared/* para shared/*
    build.onResolve({ filter: /^@shared\// }, (args) => {
      const aliasPath = args.path.replace('@shared/', '');
      let resolvedPath = resolve(__dirname, 'shared', aliasPath);
      
      // Se não tem extensão, tentar adicionar .ts
      if (!extname(resolvedPath)) {
        const withTs = `${resolvedPath}.ts`;
        if (existsSync(withTs)) {
          resolvedPath = withTs;
        }
      }
      
      return {
        path: resolvedPath,
      };
    });
  },
};

await build({
  entryPoints: ['server/_core/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/index.js',
  packages: 'external',
  plugins: [aliasPlugin],
  logLevel: 'info',
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});

