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
| `E` | pegar / interagir (perto de objetos) |
| `0-9`, `Enter`, `Backspace` | digitar o código do cofre |
| `M` | ligar/desligar o som |
| `Esc` | pausar |

No celular: joystick à esquerda, arraste à direita para olhar e botões de
luz/**PEGAR**/correr/agachar, mais `−` / `+` para o brilho. O botão **PEGAR**
muda de texto conforme o objeto próximo (pegar pilha, ler folha, abrir cofre,
usar chave).

**Objetivo:** cada pilha dura 2 minutos. Com 10 segundos restantes a luz começa
a piscar. Há 3 pilhas escondidas: uma em cima da cama, outra no fundo do último
cômodo e outra ao lado da porta de saída. Quando a atual morre, a reserva entra
automaticamente. Se acabar a última pilha, você morre no escuro — o som de luta
já avisa, sem monstro.

A **folha única** está pregada na parede da divisão, do lado do quarto (andar
de cima). Ao apertar para ler, aparece **apenas a imagem** da folha suja em
primeiro plano, sem nenhum texto adicional (`Enter`, `Espaço` ou `Esc` para
guardar). Os quatro códigos estão na imagem, na ordem certa, e ela vem embutida
no `index.html`, sem internet. O **cofre está em cima do criado-mudo no quarto**
e guarda a chave da porta. Abra-o com `E`/**PEGAR**, digite os quatro números da
folha, pegue a chave e desça para usar na porta de saída.

**Áudios:** ao entrar toca o fundo de "cena de assassino"; ao ler a folha do
quarto o fundo muda para a "floresta escura"; quando a última pilha morre toca o
som de luta. Eles vêm embutidos no `index.html` (um único arquivo, sem internet).

As pilhas vêm numa **caixa verde com rótulo "PILHAS AA"**, com duas pilhas AA
realistas (corpo prateado, anel escuro e contato de cobre) dentro dela.

Use fone de ouvido: o áudio é gerado em tempo real (drone grave, passos com
eco de porão, goteiras, rangidos da escada e guinchos de rato).

## O que já existe

- Casa em **tamanho normal** (8,4 × 7,2 × 3 m por andar). O porão tem paredes e
  piso de concreto, janela gradeada e a **única porta da casa** (a de saída,
  trancada, com o caminho livre de caixas). Também tem canos, caldeira,
  prateleiras, bancada, cadeira tombada, entulho, poças, manchas e teias.
- Escada de 30 degraus totalmente aberta: **sem madeiras laterais, sem corrimão
  e sem cano de ferro atravessando os degraus**. Sobe até um **andar superior**
  com corredor e quarto — o quarto é
  aberto, sem porta nem batente. O jogador sobe e desce com piso interpolado;
  as colisões são separadas por andar. Móveis e jogador usam a mesma escala.
- **Texturas 100% procedurais**: cor, normal e rugosidade geradas em canvas
  (umidade, rachaduras, ferrugem, veios de madeira, cascalho). Nenhum asset
  externo é baixado.
- Lanterna com `SpotLight` com **o dobro da intensidade** (60), queda física,
  reflector suave (cookie), spill, sombras suaves, tremor de passo, contato
  frouxo e **brilho ajustável em jogo** (o valor fica salvo para a próxima
  partida).
- Ar limpo: sem névoa e sem poeira. Só um feixe visível muito sutil.
- Pós-processamento com grão de filme, vinheta, aberração cromática e
  coloração verde-amarelada doente.
- Colisão com paredes e objetos, passo com head-bob, agachamento e corrida.
- Áudio procedural com reverberação sintética de porão.
- **Pilhas limitadas**: 2 min cada, aviso de 10 s piscando e troca automática
  das reservas. HUD mostra tempo restante, reservas e se você já tem a chave.
- **Cofre com senha** sobre o criado-mudo do quarto: uma folha suja pregada na
  parede da divisão traz os quatro dígitos destacados entre as palavras. Ao
  abrir, a chave aparece dentro dele; use-a na porta lá embaixo.
- **Chave + cadeado** na única porta de saída: sem a chave ela não abre; com ela
  você vence. As frases automáticas da história aparecem **no máximo uma vez por
  partida** (a folha pode ser relida, pois é ação direta do jogador).
- Sangue na cama e nas paredes do quarto, ratos que dão sustos curtos com
  guincho e um tremor leve de câmera (sem flash vermelho), rangidos ao subir a
  escada e uma lâmpada do andar de cima que pisca a cada 30 segundos. A entrada
  da escada ao lado da porta ficou aberta, com mais espaço para passar.

## No celular

Detecção automática de toque: joystick à esquerda, arraste à direita para
olhar, botões de luz/PEGAR/correr/agachar e `−` / `+` de brilho. Também reduz
resolução das texturas (256 px), sombra (512 px) e desliga antialias para o
jogo carregar e rodar mais rápido. O pós-processamento tem fallback para
render direto caso o aparelho não suporte.

Se o jogo ficar preso em "CARREGANDO AMBIENTE...", aparecerá um aviso vermelho
com o erro na parte de baixo da tela.

### Erro "Error creating WebGL context"

Isso significa que o navegador/aparelho não conseguiu criar o WebGL — não é um
problema do jogo. O aviso na tela agora traz um diagnóstico (`webgl2`, `webgl` e
navegador). Para testar, abra `https://get.webgl.org/` no mesmo navegador. No
Android, ative a aceleração de hardware / use Chrome ou Firefox; em desktop,
ative a aceleração de hardware nas configurações do navegador. Se ainda falhar,
me envie o texto completo do aviso vermelho.

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
- `src/items.js` — pilhas, chave, papéis, cofre e cadeado.
- `src/rats.js` — sustos com ratos.
- `assets/audio/` — áudios embutidos no build (`death`, `start`, `forest`).
- `src/index.template.html` / `src/style.css` — interface.

## Próximos passos sugeridos

1. Quebra gradual da sanidade (visão/áudio distorcido conforme o tempo passa).
2. Mais esconde-esconde: armários onde se esconder dos ratos.
3. Dificuldade ajustável (duração da pilha).
