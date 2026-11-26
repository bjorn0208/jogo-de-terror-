Coloque aqui o arquivo do monstro com o nome exato:

    monster.glb

O jogo tenta carregar `assets/monster.glb` automaticamente. Para usar o modelo
do Hyper3D: abra o projeto no Hyper3D → **Export / Download** → formato **GLB**
→ salve como `monster.glb` nesta pasta e recarregue a página
(`http://127.0.0.1:8080/index.html?v=3`).

Se o arquivo não existir, o jogo usa um monstro provisório de silhueta.

O modelo é redimensionado automaticamente para ~1,7 m de altura e apoia o pé
no chão. Se ele estiver olhando para trás, troque a rotação no `monster.js`.
