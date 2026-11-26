# PORÃO — jogo de terror

Primeiro protótipo de um jogo de terror **first-person** em uma casa velha, com
estética de Silent Hill: névoa, concreto úmido, ferrugem, poeira e **a lanterna
como única fonte de luz**.

O repositório estava vazio; este é o ponto de partida.

## Como jogar

Abra **`index.html`** no navegador (funciona direto do arquivo, sem servidor e
sem internet). Clique em **ENTRAR NO PORÃO**.

| Tecla | Ação |
| --- | --- |
| `W A S D` | mover |
| `Mouse` | olhar |
| `Shift` | correr |
| `C` | agachar |
| `F` | ligar/desligar a lanterna |
| `M` | ligar/desligar o som |
| `Esc` | pausar |

No celular: joystick à esquerda, arraste à direita para olhar e botões de
luz/correr/agachar.

Use fone de ouvido: o áudio é gerado em tempo real (drone grave, passos com
eco de porão, goteiras e rangidos).

## O que já existe

- Quarto/casa de baixo de ~8 × 7 m com paredes e piso de concreto, teto,
  janela gradeada, porta trancada, canos, caldeira, prateleiras com caixas e
  potes, bancada com ferramentas, cadeira tombada, entulho, poças, manchas e
  teias de aranha.
- **Texturas 100% procedurais**: cor, normal e rugosidade geradas em canvas
  (umidade, rachaduras, ferrugem, veios de madeira, cascalho). Nenhum asset
  externo é baixado.
- Lanterna com `SpotLight`, sombras suaves, tremor de passo, contato frouxo
  (pequenas quedas de luz) e cone de feixe muito sutil.
- Poeira suspensa que só aparece dentro do feixe.
- Névoa, pós-processamento com grão de filme, vinheta, aberração cromática e
  coloração verde-amarelada doente.
- Colisão com paredes e objetos, passo com head-bob, agachamento e corrida.
- Áudio procedural com reverberação sintética de porão.
- Um monstro que **avança quando você não está olhando** e congela quando a
  lanterna o pega. Opcionalmente carrega `assets/monster.glb` (coloque o modelo
  do Hyper3D lá com esse nome); sem arquivo, usa uma silhueta provisória.

## No celular

Detecção automática de toque: joystick à esquerda, arraste à direita para
olhar, botões de luz/correr/agachar. Também reduz resolução das texturas
(256 px), poeira (220 partículas), sombra (512 px) e desliga antialias para o
jogo carregar e rodar mais rápido. O pós-processamento tem fallback para
render direto caso o aparelho não suporte.

Se o jogo ficar preso em "CARREGANDO AMBIENTE...", aparecerá um aviso vermelho
com o erro na parte de baixo da tela.

## Desenvolvimento

```bash
bun install
bun run build   # gera e atualiza index.html (arquivo único, pronto para jogar)
bun run dev     # rebuild automático ao editar src/
bun run check   # checagem de sintaxe
```

- `src/main.js` — loop, lanterna, HUD, início/pausa.
- `src/room.js` — cenário e colisores.
- `src/textures.js` — gerador das texturas.
- `src/atmosphere.js` — poeira e volume do feixe.
- `src/controls.js` — first-person, colisão, mouse e toque.
- `src/audio.js` — sons sintetizados.
- `src/postfx.js` — correção de cor e filme.
- `src/monster.js` — monstro e carregamento opcional do `.glb`.
- `assets/` — onde colocar `monster.glb`.
- `src/index.template.html` / `src/style.css` — interface.

## Próximos passos sugeridos

1. Abrir a porta/escada e criar o corredor (continuação da casa).
2. Inimigo com IA simples que só se move quando você não está olhando.
3. Sistema de pilha da lanterna e baterias espalhadas pelo cenário.
4. Diálogo/estrofe de texto e quebra gradual da sanidade.
5. Interação com objetos (`E`) e um inventário mínimo.
