# Pixel Studio para Windows

Aplicativo desktop portátil e open-source, com licença MIT, para desenhar pixel art e animar frame a frame. Abre em uma janela própria, com menus do Windows, ícone e acesso a arquivos locais. Todo o editor é incluído no executável e funciona offline, sem navegador ou servidor.

## Usar

Os executáveis estão na seção [Releases](https://github.com/zscrow/pixel-studio/releases) do repositório.

- **Portátil:** baixe e execute `Pixel-Studio-1.0.0-Windows.exe`, sem instalação. Node.js não é necessário.
- O perfil local é salvo na pasta `PixelStudio-Data`, ao lado do executável. Para levar o aplicativo e seus desenhos para outro computador, copie o executável e essa pasta juntos.
- Os executáveis são gerados em `release/`, fora do histórico Git.

O aplicativo usa Electron. Esta versão não possui assinatura digital de publicador.

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

O salvamento automático fica na pasta `PixelStudio-Data` na versão portátil. Na versão instalada ou em desenvolvimento, o perfil fica em `%APPDATA%/Pixel Studio`. Use Salvar projeto para guardar todos os frames em JSON e Abrir projeto para continuar depois. Para trazer um desenho da versão anterior, salve o JSON nela e abra no aplicativo. Mantenha uma cópia JSON dos seus projetos.

Onion skin é uma referência visual; não faz parte dos arquivos exportados. Os frames são desenhados manualmente, sem interpolação automática.

## Verificação

Requer Windows x64 e Node.js LTS para desenvolver. O usuário final só precisa do executável.

```sh
npm ci
npm start
npm test
npm run build:win
```

Para gerar um instalador opcional com atalhos no Windows, execute `npm run build:installer`.

## Licença

[MIT](LICENSE). É permitido usar, estudar, modificar e redistribuir o código, inclusive comercialmente, preservando o aviso de copyright e a licença. As dependências mantêm suas próprias licenças.

`desktop/` contém a janela, os menus e o ícone. `dist/` contém o editor empacotado localmente. `tests/` verifica desenho, histórico, onion skin e organização dos frames.

Atalhos desktop: `Ctrl+N` novo projeto, `Ctrl+O` abrir, `Ctrl+S` salvar, `Ctrl+D` duplicar frame, `Ctrl+Shift+N` novo frame, `Ctrl+Shift+E` exportar PNG e `F11` tela cheia.
