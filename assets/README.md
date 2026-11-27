Pasta dos áudios embutidos no `index.html` pelo `build.mjs`:

- `death.mp3` — toca quando a última pilha morre (som de luta).
- `start.mp3` — fundo ao entrar no jogo (cena de assassino).
- `forest.mp3` — fundo depois de ler a folha do quarto (floresta escura).
- `safe.mp3` — som do cofre abrindo (link enviado).
- `win.mp3` — som ao abrir a porta de saída e terminar o jogo (link enviado).

O build converte esses arquivos para data URI e grava em
`window.__PORAO_AUDIO__`, então o `index.html` continua sendo um único arquivo
funcionando offline. Não é preciso hospedar esta pasta junto do HTML.
