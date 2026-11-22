const { app, BrowserWindow, Menu, dialog, session, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
let window;
const smoke = process.argv.includes('--smoke-test');
app.setName('Pixel Studio');
app.setAppUserModelId('com.zscrow.pixelstudio');
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  const profilePath = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'PixelStudio-Data');
  try {
    require('node:fs').mkdirSync(profilePath, { recursive: true });
    app.setPath('userData', profilePath);
  } catch {
    dialog.showErrorBox('Pixel Studio portátil', 'Coloque o executável em uma pasta onde você tenha permissão de escrita, para salvar seus projetos e preferências.');
    app.exit(1);
  }
}
const ownLock = app.requestSingleInstanceLock();
if (!ownLock) app.quit();
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
  app.whenReady().then(createWindow).catch(error => { console.error(error.message); app.exit(1); });
}
function command(id) { window?.webContents.send('editor-command', id); }
function createWindow() {
  ipcMain.handle('project-open', async event => {
    if (event.sender !== window?.webContents) throw new Error('Janela inválida.');
    const result = await dialog.showOpenDialog(window, { title: 'Abrir projeto Pixel Studio', properties: ['openFile'], filters: [{ name: 'Projetos Pixel Studio', extensions: ['pxp', 'json'] }, { name: 'Projeto Pixel Studio (.pxp)', extensions: ['pxp'] }, { name: 'Projeto antigo (.json)', extensions: ['json'] }] });
    if (result.canceled || !result.filePaths.length) return null;
    const filePath = result.filePaths[0];
    const info = await fs.stat(filePath);
    if (info.size > 100 * 1024 * 1024) throw new Error('Projeto maior que 100 MB.');
    return { text: await fs.readFile(filePath, 'utf8'), name: path.basename(filePath).replace(/\.(pxp|json)$/i, '') };
  });
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  window = new BrowserWindow({
    title: 'Pixel Studio', width: 1440, height: 1000, minWidth: 850, minHeight: 650,
    backgroundColor: '#10131a', show: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  window.webContents.on('did-fail-load', (_event, code, description) => { console.error(`Falha ao carregar: ${code} ${description}`); if (smoke) app.exit(1); });
  window.webContents.on('render-process-gone', (_event, details) => { console.error(`Renderer encerrado: ${details.reason}`); if (smoke) app.exit(1); });
  window.webContents.session.on('will-download', (event, item, contents) => {
    if (contents !== window.webContents || !item.getURL().startsWith('blob:file:')) { event.preventDefault(); return; }
    const project = /\.pxp$/i.test(item.getFilename());
    item.setSaveDialogOptions({ title: project ? 'Salvar projeto .pxp — Pixel Studio' : 'Exportar PNG — Pixel Studio', defaultPath: path.join(app.getPath('documents'), path.basename(item.getFilename())), filters: project ? [{ name: 'Projeto Pixel Studio', extensions: ['pxp'] }] : [{ name: 'Imagem PNG', extensions: ['png'] }] });
  });
  window.once('ready-to-show', () => {
    if (smoke) { console.log('DESKTOP_SMOKE_OK: janela carregou os arquivos locais com sandbox e contextIsolation.'); app.exit(0); }
    else window.show();
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Arquivo', submenu: [
      { label: 'Novo projeto', accelerator: 'CmdOrCtrl+N', click: () => command('newProject') },
      { label: 'Abrir projeto…', accelerator: 'CmdOrCtrl+O', click: () => command('open') },
      { label: 'Salvar projeto…', accelerator: 'CmdOrCtrl+S', click: () => command('save') },
      { type: 'separator' },
      { label: 'Exportar frame PNG…', accelerator: 'CmdOrCtrl+Shift+E', click: () => command('export') },
      { label: 'Exportar spritesheet…', click: () => command('sheet') },
      { type: 'separator' }, { role: 'quit', label: 'Sair' }
    ] },
    { label: 'Editar', submenu: [
      { label: 'Desfazer', accelerator: 'CmdOrCtrl+Z', click: () => command('undo') },
      { label: 'Refazer', accelerator: 'CmdOrCtrl+Y', click: () => command('redo') },
      { type: 'separator' }, { role: 'cut', label: 'Recortar texto' }, { role: 'copy', label: 'Copiar texto' }, { role: 'paste', label: 'Colar texto' }, { role: 'selectAll', label: 'Selecionar texto' }
    ] },
    { label: 'Animação', submenu: [
      { label: 'Reproduzir / pausar', click: () => command('play') },
      { label: 'Novo frame', accelerator: 'CmdOrCtrl+Shift+N', click: () => command('add') },
      { label: 'Duplicar frame', accelerator: 'CmdOrCtrl+D', click: () => command('duplicate') }
    ] },
    { label: 'Visualizar', submenu: [{ role: 'togglefullscreen', label: 'Tela cheia' }, { label: 'Alternar grade', click: () => command('grid') }] },
    { label: 'Ajuda', submenu: [{ label: 'Sobre o Pixel Studio', click: () => dialog.showMessageBox(window, { type: 'info', title: 'Pixel Studio', message: `Pixel Studio ${app.getVersion()}`, detail: 'Editor de pixel art e animação para Windows.\nFunciona offline.\n\nB: lápis • E: borracha • G: preencher • I: conta-gotas\nEspaço: reproduzir / pausar\n\nSalve o projeto .pxp para transportar seus desenhos. Projetos antigos .json também podem ser abertos.' }) }] }
  ]));
  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  if (smoke) setTimeout(() => { console.error('Tempo limite ao abrir o aplicativo.'); app.exit(1); }, 30000).unref();
}
app.on('window-all-closed', () => app.quit());
