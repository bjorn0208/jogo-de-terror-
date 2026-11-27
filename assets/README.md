Áudios e vídeos embutidos no `index.html` pelo `build.mjs`:

- `death.mp3` — toca quando a última pilha morre (som de luta).
- `start.mp3` — fundo ao entrar no jogo (cena de assassino).
- `forest.mp3` — fundo depois de ler a folha do quarto (floresta escura).
- `safe.mp3` — som do cofre abrindo (link enviado).
- `win.mp3` — som ao abrir a porta de saída e terminar o jogo (link enviado).
- `video/death.mp4` — vídeo ao acabar a última pilha.
- `video/win.mp4` — vídeo ao concluir o jogo.

O build converte esses arquivos para data URI e grava em
`window.__PORAO_AUDIO__`, `window.__PORAO_DEATH_VIDEO__` e
`window.__PORAO_WIN_VIDEO__`, então o `index.html` continua sendo um único
arquivo funcionando offline. Não é preciso hospedar esta pasta junto do HTML.
