# PORÃO — jogo de terror

Primeiro protótipo de um jogo de terror **first-person** em uma casa velha, com
estética de Silent Hill: névoa, concreto úmido, ferrugem, poeira e **a lanterna
como única fonte de luz**.

O repositório estava vazio; este é o ponto de partida.

## Como jogar

Abra **`index.html`** no navegador (funciona direto do arquivo, sem servidor e
sem internet). O **trailer abre antes do menu**; quando ele termina (ou ao clicar
em **PULAR**), aparece uma tela escura com o texto **entrar no porão** no meio.

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
automaticamente. Se acabar a última pilha, um vídeo ocupa a tela; quando ele
termina, toca o som da morte e aparece a tela final. Sem monstro.

A **folha única** está pregada na parede da divisão, do lado do quarto (andar
de cima). Ao apertar para ler, aparece **apenas a imagem** da folha suja
ocupando a tela inteira, sem bordas, cabeçalho ou texto. Para guardar, toque na
imagem (ou use `Enter`, `Espaço` ou `Esc`). Os quatro códigos estão na imagem, na
ordem certa, e ela vem embutida no `index.html`, sem internet. O **cofre está em cima do criado-mudo no quarto**
e guarda a chave da porta. Abra-o com `E`/**PEGAR**, digite os quatro números da
folha, pegue a chave e desça para usar na porta de saída.

**Áudios/vídeo:** o trailer enviado abre o jogo (com áudio se o navegador
permitir; se bloquear, aparece o botão **ATIVAR SOM**). Depois de entrar toca o
fundo de "cena de assassino"; ao ler a folha do quarto o fundo muda para a
"floresta escura"; ao acabar a última pilha aparece o vídeo da morte e, no fim
dele, toca o som de luta. Ao abrir o cofre toca o som de cofre abrindo e ao abrir
a porta de saída toca o som de porta/vitória — os dois enviados por você. Ao
concluir o jogo aparece o vídeo de vitória enviado e só depois a tela final.
Tudo vem embutido no `index.html` (um único arquivo, sem internet). Os vídeos
da morte e da vitória rodam sem áudio para poderem iniciar sozinhos.

As pilhas vêm numa **caixa verde com rótulo "PILHAS AA"**, com duas pilhas AA
realistas (corpo prateado, anel escuro e contato de cobre) dentro dela.

Use fone de ouvido: o áudio é gerado em tempo real (drone grave, passos com
eco de porão, goteiras, rangidos da escada e guinchos de rato).

## O que já existe

- **Trailer de abertura** em vídeo, exibido em tela cheia antes do menu, com
  botão para pular e opção de ativar o som se o autoplay com áudio for bloqueado.
- Casa ampliada para **13,2 × 7,2 × 3 m por andar**, mais um **sótão** de 2,2 m
  de altura. O porão mantém a janela gradeada e a **porta de saída trancada**
  (caminho livre de caixas), além de canos, caldeira, prateleiras, bancada,
  cadeira tombada, entulho, poças, manchas e teias.
- **Cozinha no porão**, pela porta aberta na ala esquerda: bancada, pia, fogão,
  geladeira e mesa. Dentro dela, um **banheiro** com sanitário, lavatório e
  chuveiro, com porta própria na parede lateral.
- **Segundo quarto no andar de cima**, na mesma ala esquerda, com cama estreita
  e guarda-roupa.
- **Escada do sótão** no canto direito do quarto: 30 degraus abertos, mesma
  rampa sólida da primeira escada, sem corrimão ou madeiras laterais. O piso
  tem dois vãos recortados para as escadas passarem.
- Escada de 30 degraus totalmente aberta: **sem madeiras laterais, sem corrimão
  e sem cano de ferro atravessando os degraus**. Os degraus são finos e ficam
  sobre uma rampa sólida (nada de colunas com cara de espetos na lateral), com o
  último degrau rente ao piso. O **andar de cima tem laje com espessura**, sem
  planos sobrepostos. Sobe até um **andar superior** com corredor e quarto — o
  quarto é
  aberto, sem porta nem batente. O jogador sobe e desce entre **três níveis**
  (porão, andar de cima e sótão) com piso interpolado; as colisões são
  separadas por andar. A escada só é aceita pela boca certa: chegar de lado no
  vão (perto da porta da cozinha, por exemplo) não joga o jogador para o andar
  de cima, e entrar de lado no buraco do andar de cima não derruba você. Móveis
  e jogador usam a mesma escala.
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
  guincho e um tremor leve de câmera (sem flash vermelho), rangidos nas duas
  escadas e uma lâmpada do andar de cima que pisca a cada 30 segundos. A entrada
  da escada ao lado da porta ficou aberta, com mais espaço para passar.

## No celular

Detecção automática de toque: joystick à esquerda, arraste à direita para
olhar, botões de luz/PEGAR/correr/agachar e `−` / `+` de brilho. Também reduz
resolução das texturas (256 px), sombra (512 px) e desliga antialias para o
jogo carregar e rodar mais rápido. O pós-processamento tem fallback para
render direto caso o aparelho não suporte.

Se o texto "entrar no porão" continuar apagado por muito tempo, aparecerá um
aviso vermelho com o erro na parte de baixo da tela.

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
