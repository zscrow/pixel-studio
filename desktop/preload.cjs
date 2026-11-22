const { ipcRenderer, contextBridge } = require('electron');
contextBridge.exposeInMainWorld('pixelDesktop', { openProject: () => ipcRenderer.invoke('project-open'), ready: () => ipcRenderer.send('editor-ready') });
const commands = new Set(['newProject', 'open', 'save', 'export', 'sheet', 'undo', 'redo', 'play', 'add', 'duplicate', 'grid', 'fit', 'onion', 'cutPixels', 'copyPixels', 'pastePixels']);
ipcRenderer.on('editor-command', (_event, id) => {
  if (!commands.has(id)) return;
  const textActions = {cutPixels:'cut',copyPixels:'copy',pastePixels:'paste',undo:'undo',redo:'redo'};
  if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName) && Object.hasOwn(textActions, id)) {
    ipcRenderer.send('editor-text-command', textActions[id]);
    return;
  }
  const element = document.getElementById(id);
  if (element && !element.disabled) element.click();
});
window.addEventListener('DOMContentLoaded', () => {
  document.title = 'Pixel Studio';
  const label = document.querySelector('.tag');
  if (label) label.textContent = 'DESKTOP • OFFLINE';
  const saved = document.getElementById('saved');
  if (saved && saved.textContent === 'Salvo neste navegador') saved.textContent = 'Salvo neste computador';
});
