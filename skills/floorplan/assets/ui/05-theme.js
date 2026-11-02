// Language and theme share one bottom settings popover; preferences keep their existing storage.
(() => {
  const T = window.floorplanTheme, I = window.FloorplanI18n;
  if (!window.Floorplan || !T || !I) return;
  const style = document.createElement('style');
  style.textContent = `
    #floorplan-settings { position:fixed; left:16px; bottom:70px; z-index:26; }
    #settings-toggle { width:44px; height:44px; display:grid; place-items:center; border:1px solid var(--hair-2); border-radius:50%; color:var(--text-2); cursor:pointer; }
    #settings-toggle:hover,#settings-toggle[aria-expanded=true] { color:var(--text); background:var(--modal-bg); }
    #settings-toggle svg { width:20px; height:20px; }
    #settings-toggle:focus-visible { outline:2px solid var(--ring); outline-offset:3px; }
    #settings-popover { position:absolute; bottom:54px; left:0; width:260px; max-width:calc(100vw - 32px); max-height:calc(100dvh - 150px); overflow:auto; padding:18px; border:1px solid var(--hair-2); border-radius:18px; background:var(--modal-bg); color:var(--text); box-shadow:0 12px 40px #0003; }
    #settings-popover[hidden] { display:none; }
    #settings-popover h2 { font-size:15px; margin:0 0 16px; }
    #settings-popover label { display:grid; gap:7px; font-size:13px; margin-top:12px; }
    #settings-popover select { width:100%; min-height:44px; padding:8px 10px; border:1px solid var(--hair-2); border-radius:10px; background:var(--modal-bg); color:var(--text); font:inherit; }
    #settings-popover select:focus-visible { outline:2px solid var(--ring); outline-offset:2px; }
    @media(max-width:1279px) { #floorplan-settings { left:16px; bottom:68px; } }
    @media(max-width:700px) { #floorplan-settings { bottom:calc(88px + env(safe-area-inset-bottom)); } body:not(.no-panel) #floorplan-settings { bottom:calc(min(56vh,480px) + 20px); } body:not(.no-panel) #settings-popover { max-height:calc(100dvh - min(56vh,480px) - 96px); } }
  `;
  document.head.appendChild(style);
  const container = document.createElement('div');
  container.id = 'floorplan-settings';
  container.setAttribute('data-no-translate', '');
  container.innerHTML = `<button id="settings-toggle" class="glass" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="settings-popover"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 3-.7 2.4-2 .9-2.3-.6-2 3.5 1.6 1.8v2l-1.6 1.8 2 3.5 2.3-.6 2 .9.7 2.4h5l.7-2.4 2-.9 2.3.6 2-3.5-1.6-1.8v-2l1.6-1.8-2-3.5-2.3.6-2-.9-.7-2.4z"/><circle cx="12" cy="12" r="3"/></svg></button>
    <div id="settings-popover" role="dialog" aria-labelledby="settings-heading" hidden><h2 id="settings-heading"></h2>
      <label for="settings-language"><span data-settings-language-label></span><select id="settings-language"><option value="pt-BR">Português</option><option value="en">English</option></select></label>
      <label for="settings-theme"><span data-settings-theme-label></span><select id="settings-theme"><option value="auto"></option><option value="light"></option><option value="dark"></option></select></label>
    </div>`;
  document.body.appendChild(container);
  const button = container.querySelector('#settings-toggle'), panel = container.querySelector('#settings-popover');
  const language = container.querySelector('#settings-language'), theme = container.querySelector('#settings-theme');
  function sync() {
    const en = I.get() === 'en', title = en ? 'Settings' : 'Configurações';
    button.title = title; button.setAttribute('aria-label', title);
    container.querySelector('#settings-heading').textContent = title;
    container.querySelector('[data-settings-language-label]').textContent = en ? 'Language' : 'Idioma';
    container.querySelector('[data-settings-theme-label]').textContent = en ? 'Theme' : 'Tema';
    const names = en ? ['Automatic (system)', 'Light', 'Dark'] : ['Automático (sistema)', 'Claro', 'Escuro'];
    [...theme.options].forEach((option, i) => option.textContent = names[i]);
    language.value = I.get(); theme.value = T.get();
  }
  function close(restoreFocus = false) {
    panel.hidden = true; button.setAttribute('aria-expanded', 'false');
    if (restoreFocus) button.focus();
  }
  button.onclick = () => {
    if (!panel.hidden) return close();
    sync(); panel.hidden = false; button.setAttribute('aria-expanded', 'true'); language.focus();
  };
  language.onchange = () => I.set(language.value);
  theme.onchange = () => T.set(theme.value);
  container.addEventListener('keydown', event => {
    // Native select navigation must not trigger canvas shortcuts.
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); close(true); }
  });
  container.addEventListener('focusout', event => { if (event.relatedTarget && !container.contains(event.relatedTarget)) close(); });
  document.addEventListener('pointerdown', event => { if (!container.contains(event.target)) close(); });
  window.addEventListener('floorplan-language-change', sync);
  window.addEventListener('floorplan-theme-change', sync);
  sync();
})();
