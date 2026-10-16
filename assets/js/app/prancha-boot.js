'use strict';
/* MEUS MAPAS · Prancha · liga as pranchas depois que o app terminou de iniciar. */
(() => {
  const start = () => { if (window.Prancha?.install && !window.Prancha.__installed) { window.Prancha.__installed = true; window.Prancha.install(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 0), { once: true });
  else setTimeout(start, 0);
})();
