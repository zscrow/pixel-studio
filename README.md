# Pixel Studio 2.0

Aplicativo Windows portátil, offline e open-source (MIT) para pixel art e animação frame a frame.

## Baixar e abrir

Baixe o ZIP na seção [Releases](https://github.com/zscrow/pixel-studio/releases), extraia **todo o conteúdo uma vez** e execute **Pixel Studio.exe** dentro da pasta extraída. Não execute dentro do ZIP. Não precisa instalar Node.js.

A pasta portátil evita a extração completa do Electron em cada abertura, feita pelas versões antigas em um único EXE autoextraível. O tempo de abertura ainda depende do computador, armazenamento, antivírus e tamanho do projeto restaurado. O perfil, as paletas e o salvamento automático ficam em **PixelStudio-Data**, ao lado de Pixel Studio.exe.

Para atualizar da versão 1.x, feche o app antigo e copie sua pasta PixelStudio-Data para junto do novo Pixel Studio.exe. Ou salve o projeto em .pxp e abra no novo app. Preserve uma cópia do perfil antigo até confirmar seus projetos.

## Workspace

A janela tem barras e painéis fixos. O canvas tem navegação própria e não aumenta a altura da interface. A linha do tempo tem rolagem horizontal; o painel lateral tem rolagem interna apenas quando seus controles não cabem.

- **Ctrl + roda do mouse:** zoom no canvas, ancorado no cursor.
- **Botão do meio + arrastar**, **H** ou **Espaço + arrastar:** navegar pelo canvas.
- **F:** enquadrar. **1:** tamanho real.
- **Play / Espaço:** reproduzir no canvas principal e no monitor.
- **Animar → Mostrar outros frames:** liga/desliga completamente o onion skin. Anteriores (1–3), próximo, opacidade e tingimento são ajustáveis. Durante o play não há onion skin.

## Ferramentas

| Atalho | Ferramenta |
| --- | --- |
| B | Lápis |
| E | Borracha |
| L | Linha: clique e arraste para prévia; solte para concluir |
| R / U | Retângulo / retângulo preenchido |
| O / Q | Elipse / elipse preenchida |
| G | Preenchimento conectado |
| I ou Alt + clique | Conta-gotas |
| V | Seleção retangular |
| M | Mover pixels da seleção ou do frame inteiro |
| H | Navegar pelo canvas |

Shift restringe linhas aos eixos/diagonais e formas a proporção quadrada. Botão direito apaga. O pincel aceita tamanhos de 1 a 16 px e simetria horizontal/vertical. Escape cancela o gesto; cada traço ou forma vira um único passo de desfazer.

Seleções: Ctrl+C copia, Ctrl+X recorta, Ctrl+V cola e ativa mover; Delete apaga a região. Sem seleção, essas operações usam o frame inteiro. Ctrl+arrastar com M duplica os pixels ao mover. A área de transferência de pixels é interna ao app.

## Projetos e frames

Salve projetos .pxp com Ctrl+S. Abra por Ctrl+O ou **arraste um arquivo .pxp/.json para qualquer parte da janela**. Projetos antigos continuam compatíveis. Arraste os thumbnails para reordenar frames; crie, duplique ou exclua pelo painel da linha do tempo. Ctrl+D duplica; Ctrl+Shift+N cria um frame.

O projeto preserva pixels, transparência, tamanho, FPS, frame selecionado e paleta atual. O formato é JSON UTF-8 aberto, com format pixel-studio e version 2. O editor aceita canvases 16, 32, 64 e 128 px, até 500 frames, FPS de 1 a 60 e cores opacas #rrggbb ou null transparente. Onion skin e seleção não entram nas imagens exportadas.

O salvamento automático é adiado em 400 ms após edições e concluído ao sair da janela. Mantenha cópias .pxp dos trabalhos importantes. Desfazer/refazer tem limite de 40 estados e aproximadamente 32 MB; projetos grandes podem ter menos passos.

## Paletas

No painel Desenhar, adicione cores com +, digite hexadecimal ou escolha no seletor. Clique direito numa cor para removê-la. Dê um nome e clique em Salvar para guardar uma paleta local; selecione suas paletas pelo menu. Também é possível importar/exportar arquivos .palette.json e extrair cores do frame atual. As cores da paleta atual acompanham o projeto .pxp.

## Exportação

PNG transparente do frame e spritesheet horizontal com escala inteira (1×, 4×, 8× e 16×), sem suavização. Use o painel Projeto para tamanho do canvas, transformações e exportação.

## Desenvolvimento

Windows x64 e Node.js 22.12+ para desenvolver.

    npm ci
    npm start
    npm test
    npm run build:win

O build principal gera Pixel-Studio-2.0.0-Windows-Portable.zip em release/. O comando npm run build:single gera o EXE autoextraível opcional, que é mais lento para abrir. npm run build:installer gera um instalador opcional. Os executáveis não têm assinatura digital de publicador.

Os testes cobrem rasterização, preenchimento, simetria, seleção/movimento, histórico, zoom ancorado, playback no canvas, onion skin, paletas e importação .pxp/.json por arraste. O modo --smoke-test só termina com sucesso depois que o renderer sinaliza que o editor iniciou e registra DESKTOP_READY_MS.

## Licença

[MIT](LICENSE). Uso, modificação e redistribuição permitidos, inclusive comercialmente, preservando o aviso de copyright e a licença. Dependências mantêm suas próprias licenças.
