# Pixel Studio

Editor de pixel art e animação em português, feito com HTML, CSS e JavaScript sem dependências.

## Usar

Abra `dist/index.html` no navegador ou sirva a pasta `dist` com qualquer servidor HTTP estático. O editor pode ser hospedado em GitHub Pages usando essa pasta como artefato.

## Recursos

- Lápis com tamanho ajustável, borracha, preenchimento e conta-gotas.
- Frames em branco ou duplicados, reordenação, exclusão e reprodução com FPS ajustável.
- Onion skin do frame anterior com opacidade ajustável.
- Espelhamento horizontal e vertical e rotação em 90 graus.
- Tela de 16, 32, 64 ou 128 pixels, grade e zoom.
- PNG transparente e spritesheet, com ampliação sem suavização.
- Histórico de desfazer/refazer, projeto JSON e salvamento local automático.

## Atalhos

`B` lápis · `E` borracha · `G` preenchimento · `I` conta-gotas · `Espaço` reproduzir/pausar · `Ctrl/Cmd+Z` desfazer · `Ctrl/Cmd+Shift+Z` ou `Ctrl+Y` refazer · `Ctrl/Cmd+S` salvar.

O salvamento automático pertence ao navegador e ao endereço usado. Baixe o projeto JSON para manter uma cópia e transferir para outro dispositivo. Onion skin é uma referência visual; não faz parte dos arquivos exportados. Os frames são desenhados manualmente, sem interpolação automática.

## Verificação

Execute `node --check dist/app.js`. Para testes funcionais, execute `node tests/editor.cjs`.
