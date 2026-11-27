import esbuild from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');
const tpl = await readFile(join(root, 'src/index.template.html'), 'utf8');
const css = await readFile(join(root, 'src/style.css'), 'utf8');

// Áudios dos links do usuário, embutidos como data URI para o jogo
// continuar funcionando offline em um único arquivo.
const audio = {};
for (const name of ['death', 'start', 'forest', 'safe', 'win']) {
  try {
    const buf = await readFile(join(root, 'assets/audio', name + '.mp3'));
    audio[name] = 'data:audio/mpeg;base64,' + buf.toString('base64');
  } catch (err) {
    console.warn('Áudio ' + name + ' não encontrado; usando apenas síntese.');
  }
}

// Imagem da folha enviada pelo usuário, também embutida como data URI.
let paperImage = '';
try {
  const buf = await readFile(join(root, 'assets/images/paper-note.jpg'));
  paperImage = 'data:image/jpeg;base64,' + buf.toString('base64');
} catch (err) {
  console.warn('Imagem da folha não encontrada; usando papel procedural.');
}

// Vídeos da morte e da vitória, embutidos para o jogo continuar offline.
let deathVideo = '', winVideo = '';
try {
  const buf = await readFile(join(root, 'assets/video/death.mp4'));
  deathVideo = 'data:video/mp4;base64,' + buf.toString('base64');
} catch (err) {
  console.warn('Vídeo da morte não encontrado; usando apenas o som.');
}
try {
  const buf = await readFile(join(root, 'assets/video/win.mp4'));
  winVideo = 'data:video/mp4;base64,' + buf.toString('base64');
} catch (err) {
  console.warn('Vídeo da vitória não encontrado; usando apenas a tela final.');
}

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
        // Funções de substituição evitam que "$&", "$'", "$1" etc. dentro do
        // bundle minificado sejam interpretados como padrões do String.replace.
        const html = tpl
          .replace('/*__STYLE__*/', () => css)
          .replace('/*__AUDIO__*/', () => JSON.stringify(audio))
          .replace('/*__PAPER__*/', () => JSON.stringify(paperImage))
          .replace('/*__DEATH_VIDEO__*/', () => JSON.stringify(deathVideo))
          .replace('/*__WIN_VIDEO__*/', () => JSON.stringify(winVideo))
          .replace('/*__BUNDLE__*/', () => safeJs);
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
