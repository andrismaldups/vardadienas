// Apply the saved appearance before the body is rendered.
(function () {
  const root = document.documentElement;
  const designs = ['classic', 'festive-s1', 'ds11', 'sea-mist'];
  const sharedDesigns = ['ds11', 'sea-mist'];
  const modes = ['auto', 'light', 'dark'];
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');

  function readPreference(key, choices) {
    try {
      const saved = localStorage.getItem(key);
      if (choices.includes(saved)) return saved;
    } catch {
      // The current session can still use the controls if storage is blocked.
    }
    return choices[0];
  }

  function savePreference(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // The root still reflects the user's current selection.
    }
  }

  let mode = readPreference('appearanceMode', modes);

  function applyMode() {
    const theme = mode === 'auto' ? (media?.matches ? 'dark' : 'light') : mode;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  }

  function applyDesign(design) {
    root.dataset.design = design;
    root.dataset.themeSystem = sharedDesigns.includes(design) ? 'shared' : 'legacy';
  }

  applyDesign(readPreference('designStyle', designs));
  applyMode();

  function bindChoices(name, currentValue, apply) {
    for (const input of document.querySelectorAll(`input[name="${name}"]`)) {
      input.checked = input.value === currentValue;
      input.addEventListener('change', () => {
        if (!input.checked) return;
        apply(input.value);
        savePreference(name, input.value);
      });
    }
  }

  function init() {
    bindChoices('designStyle', root.dataset.design, applyDesign);
    bindChoices('appearanceMode', mode, value => {
      mode = value;
      applyMode();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  function followSystemMode() {
    if (mode === 'auto') applyMode();
  }

  if (media?.addEventListener) {
    media.addEventListener('change', followSystemMode);
  } else {
    media?.addListener(followSystemMode);
  }
})();
