const { contextBridge, ipcRenderer } = require("electron");
const listeners = new Map();
ipcRenderer.on("chat:delta", (_e, { id, text }) => { const fn = listeners.get(id); if (fn) fn(text); });
contextBridge.exposeInMainWorld("api", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (s) => ipcRenderer.invoke("settings:set", s),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  chat: async (system, messages, onText) => {
    const id = Math.random().toString(36).slice(2);
    listeners.set(id, onText);
    try { return await ipcRenderer.invoke("chat", { id, system, messages }); }
    finally { listeners.delete(id); }
  },
  feedback: (prompt) => ipcRenderer.invoke("feedback", { prompt }),
});
