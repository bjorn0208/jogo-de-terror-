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
| `-` / `+` | diminuir/aumentar o brilho (20% a 180%) |
| `E` | usar a chave na porta de saída |
| `M` | ligar/desligar o som |
| `Esc` | pausar |

No celular: joystick à esquerda, arraste à direita para olhar e botões de
luz/chave/correr/agachar, mais `−` / `+` para o brilho.

**Objetivo:** cada pilha dura 2 minutos. Com 10 segundos restantes a luz começa
a piscar. Há no máximo 3 pilhas reservas escondidas pela casa; quando a atual
morre, a reserva entra automaticamente. Se acabar a última pilha, o monstro vem
e te mata. Para sair, ache a **chave do cadeado** (escondida perto da cama no
andar de cima) e use-a na porta de saída com `E` / botão **CHAVE**.

Use fone de ouvido: o áudio é gerado em tempo real (drone grave, passos com
eco de porão, goteiras, rangidos da escada e guinchos de rato).

## O que já existe

- Casa com o **dobro do tamanho em todas as direções** (16,8 × 14,4 × 6 m por
  andar). O porão tem paredes e piso de concreto, janela gradeada e a **única
  porta da casa** (a de saída, trancada). Também tem canos, caldeira,
  prateleiras, bancada, cadeira tombada, entulho, poças, manchas e teias.
- Escada de 30 degraus com corrimão apenas na lateral (o caminho fica livre)
  até um **andar superior** com corredor e quarto — o quarto é aberto, sem
  porta nem batente. O jogador sobe e desce com altura de piso interpolada;
  as colisões são separadas por andar. O jogador mantém o tamanho humano, então
  tudo à volta dele ficou duas vezes maior.
- **Texturas 100% procedurais**: cor, normal e rugosidade geradas em canvas
  (umidade, rachaduras, ferrugem, veios de madeira, cascalho). Nenhum asset
  externo é baixado.
- Lanterna com `SpotLight`, queda física, reflector suave (cookie), spill,
  sombras suaves, tremor de passo, contato frouxo e **brilho ajustável em jogo**
  (o valor fica salvo para a próxima partida).
- Ar limpo: sem névoa e sem poeira. Só um feixe visível muito sutil.
- Pós-processamento com grão de filme, vinheta, aberração cromática e
  coloração verde-amarelada doente.
- Colisão com paredes e objetos, passo com head-bob, agachamento e corrida.
- Áudio procedural com reverberação sintética de porão.
- Um monstro que **avança quando você não está olhando** e congela quando a
  lanterna o pega. Sem luz, ele caça direto. Opcionalmente carrega
  `assets/monster.glb` (coloque o modelo do Hyper3D lá com esse nome); sem
  arquivo, usa uma silhueta provisória.
- **Pilhas limitadas**: 2 min cada, aviso de 10 s piscando e troca automática
  das reservas. HUD mostra tempo restante, reservas e se você já tem a chave.
- **Chave + cadeado** na única porta de saída: sem a chave ela não abre; com ela
  você vence. As frases da história aparecem **no máximo uma vez por partida**.
- **Pistas em papéis** espalhados pela casa, sangue na cama e nas paredes do
  quarto, ratos que dão sustos curtos com guincho e flash vermelho, rangidos ao
  subir a escada e uma lâmpada do andar de cima que pisca a cada 30 segundos.

## No celular

Detecção automática de toque: joystick à esquerda, arraste à direita para
olhar, botões de luz/chave/correr/agachar e `−` / `+` de brilho. Também reduz
resolução das texturas (256 px), sombra (512 px) e desliga antialias para o
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
- `src/items.js` — pilhas, chave, papéis e cadeado.
- `src/rats.js` — sustos com ratos.
- `assets/` — onde colocar `monster.glb`.
- `src/index.template.html` / `src/style.css` — interface.

## Próximos passos sugeridos

1. Quebra gradual da sanidade (visão/distorted audio conforme o tempo passa).
2. Mais esconde-esconde: armários onde se esconder do monstro.
3. Dificuldade ajustável (duração da pilha e velocidade do monstro).
