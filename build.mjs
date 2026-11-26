import esbuild from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');
const tpl = await readFile(join(root, 'src/index.template.html'), 'utf8');
const css = await readFile(join(root, 'src/style.css'), 'utf8');

const options = {
  entryPoints: [join(root, 'src/main.js')],
  outfile: 'bundle.js',
  bundle: true,
  write: false,
  format: 'iife',
  target: ['es2020'],
  minify: true,
  legalComments: 'none',
  plugins: [{
    name: 'inline-into-html',
    setup(build) {
      build.onEnd(async (result) => {
        if (result.errors.length) return;
        const js = (result.outputFiles || []).find((f) => f.path.endsWith('bundle.js'))?.text || '';
        const safeJs = js.replace(/<\/script/gi, '<\\/script');
        const html = tpl.replace('/*__STYLE__*/', css).replace('/*__BUNDLE__*/', safeJs);
        await writeFile(join(root, 'index.html'), html);
        console.log(`index.html gerado (${(html.length / 1024).toFixed(0)} KB)`);
      });
    },
  }],
};

const ctx = await esbuild.context(options);
await ctx.rebuild();
if (watch) {
  console.log('Observando src/ ... (Ctrl+C para sair)');
  await ctx.watch();
} else {
  await ctx.dispose();
}
