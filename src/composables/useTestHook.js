// 阶段 1 自检钩子 (仅 Vite dev 模式 #test 路由激活)
// 对齐原 public/js/app.js 的自检字段: cardsFound / editorInDom / modeTabs / templateCompileErrors / errors
// 在 main.js 启动后注入到 window
export function installTestHook() {
  if (!window.location.hash.includes('test')) return;
  setTimeout(async () => {
    const errs = [];
    const oerr = window.console.error;
    window.console.error = function (...a) {
      errs.push(a.map(x => String(x?.message || x)).join(' '));
      oerr.apply(window.console, a);
    };
    window.addEventListener('unhandledrejection', e =>
      errs.push('UNHANDLED: ' + (e.reason?.message || JSON.stringify(e.reason)))
    );
    window.addEventListener('error', e =>
      errs.push('ERROR: ' + e.message + ' at ' + e.filename + ':' + e.lineno)
    );

    const cards = document.querySelectorAll('.card');
    if (cards.length > 0) {
      cards[0].click();
      await new Promise(r => setTimeout(r, 1500));
    }

    const result = {
      cardsFound: cards.length,
      editorInDom: !!document.querySelector('section[aria-label="笔记编辑器"]'),
      modeSwitcherInDom: !!document.querySelector('.mode-switcher'),
      modeTabs: document.querySelectorAll('.mode-tab').length,
      templateCompileErrors: errs.filter(e =>
        e.includes('Template compilation') ||
        e.includes('Invalid or unexpected token') ||
        e.includes('parsing')
      ),
      errors: errs
    };

    const pre = document.createElement('pre');
    pre.id = 'test-final';
    pre.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#000;color:#0f0;padding:8px;z-index:99999;font-size:11px;white-space:pre-wrap';
    pre.textContent = JSON.stringify(result, null, 2);
    document.body.appendChild(pre);
  }, 2500);
}
