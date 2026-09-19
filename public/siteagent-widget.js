(() => {
  const script = document.currentScript;
  if (!script) return;
  const agentKey = script.dataset.agentKey || '';
  if (!agentKey) {
    console.warn('[SUMMECA SiteAgent] Missing data-agent-key.');
    return;
  }

  const apiBase = (() => {
    try { return new URL(script.src).origin; } catch { return 'https://summeca.com'; }
  })();
  const keyPrefix = 'summeca-siteagent:' + agentKey + ':';
  const visitorKey = (() => {
    try {
      const existing = localStorage.getItem(keyPrefix + 'visitor');
      if (existing) return existing;
      const value = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
      localStorage.setItem(keyPrefix + 'visitor', value);
      return value;
    } catch {
      return String(Date.now()) + Math.random();
    }
  })();

  const css = document.createElement('style');
  css.textContent = `
    .summeca-siteagent-launcher{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:56px;height:56px;border:0;border-radius:50%;background:#0f9f95;color:white;box-shadow:0 12px 34px rgba(15,159,149,.32);font:700 24px/1 system-ui;cursor:pointer}
    .summeca-siteagent-panel{position:fixed;right:20px;bottom:88px;z-index:2147483000;width:min(370px,calc(100vw - 24px));height:min(600px,calc(100vh - 120px));display:none;flex-direction:column;overflow:hidden;border:1px solid #d8e3e2;border-radius:20px;background:white;color:#152323;box-shadow:0 24px 60px rgba(0,0,0,.2);font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .summeca-siteagent-panel[data-open="true"]{display:flex}
    .summeca-siteagent-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#0d2423;color:white}
    .summeca-siteagent-head strong{font-size:14px}.summeca-siteagent-close{border:0;background:transparent;color:white;font-size:22px;cursor:pointer}
    .summeca-siteagent-profile{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px 12px;border-bottom:1px solid #edf1f1}
    .summeca-siteagent-profile input{min-width:0;border:1px solid #dce6e5;border-radius:10px;padding:9px 10px;font:inherit}
    .summeca-siteagent-messages{flex:1;overflow:auto;padding:14px;background:#f8fbfb}
    .summeca-siteagent-msg{max-width:85%;margin:0 0 10px;padding:10px 12px;border-radius:14px;white-space:pre-wrap;overflow-wrap:anywhere}
    .summeca-siteagent-msg.ai{background:white;border:1px solid #e1e9e8}.summeca-siteagent-msg.user{margin-left:auto;background:#0f9f95;color:white}
    .summeca-siteagent-form{display:flex;gap:8px;padding:12px;border-top:1px solid #edf1f1;background:white}
    .summeca-siteagent-form textarea{flex:1;resize:none;min-height:42px;max-height:100px;border:1px solid #d6e1e0;border-radius:12px;padding:10px;font:inherit}
    .summeca-siteagent-send{align-self:flex-end;border:0;border-radius:11px;background:#0f9f95;color:white;padding:12px 14px;font-weight:700;cursor:pointer}
    .summeca-siteagent-send:disabled{opacity:.55;cursor:wait}
    .summeca-siteagent-status{padding:0 12px 9px;color:#637474;font-size:11px;background:white}
    @media(max-width:520px){.summeca-siteagent-panel{right:12px;bottom:80px;height:calc(100vh - 100px)}.summeca-siteagent-launcher{right:14px;bottom:14px}}
  `;
  document.head.appendChild(css);

  const panel = document.createElement('section');
  panel.className = 'summeca-siteagent-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Website assistant');
  panel.innerHTML = `
    <div class="summeca-siteagent-head"><strong>AI website assistant</strong><button class="summeca-siteagent-close" aria-label="Close assistant">×</button></div>
    <div class="summeca-siteagent-profile">
      <input name="name" autocomplete="name" placeholder="Name (optional)">
      <input name="email" type="email" autocomplete="email" placeholder="Email for follow-up">
    </div>
    <div class="summeca-siteagent-messages" aria-live="polite">
      <div class="summeca-siteagent-msg ai">Hi! How can I help today?</div>
    </div>
    <form class="summeca-siteagent-form">
      <textarea name="message" rows="1" maxlength="2000" placeholder="Ask a question…" required></textarea>
      <button class="summeca-siteagent-send" type="submit">Send</button>
    </form>
    <div class="summeca-siteagent-status">Powered by SUMMECA SiteAgent AI</div>
  `;

  const launcher = document.createElement('button');
  launcher.className = 'summeca-siteagent-launcher';
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Open website assistant');
  launcher.textContent = '✦';

  document.body.append(panel, launcher);
  const messages = panel.querySelector('.summeca-siteagent-messages');
  const form = panel.querySelector('.summeca-siteagent-form');
  const messageInput = form.querySelector('[name="message"]');
  const nameInput = panel.querySelector('[name="name"]');
  const emailInput = panel.querySelector('[name="email"]');
  const sendButton = panel.querySelector('.summeca-siteagent-send');
  const status = panel.querySelector('.summeca-siteagent-status');

  function addMessage(role, content) {
    const item = document.createElement('div');
    item.className = 'summeca-siteagent-msg ' + role;
    item.textContent = content;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  }

  launcher.addEventListener('click', () => {
    panel.dataset.open = panel.dataset.open === 'true' ? 'false' : 'true';
    if (panel.dataset.open === 'true') setTimeout(() => messageInput.focus(), 0);
  });
  panel.querySelector('.summeca-siteagent-close').addEventListener('click', () => {
    panel.dataset.open = 'false';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = messageInput.value.trim();
    if (!message) return;
    addMessage('user', message);
    messageInput.value = '';
    sendButton.disabled = true;
    status.textContent = 'SiteAgent is replying…';

    let conversationId = '';
    try { conversationId = localStorage.getItem(keyPrefix + 'conversation') || ''; } catch {}

    try {
      const res = await fetch(apiBase + '/api/siteagent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentKey,
          conversationId,
          visitorKey,
          visitorName: nameInput.value.trim(),
          visitorEmail: emailInput.value.trim(),
          message,
          pageUrl: location.href,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to get a reply.');
      if (data.conversationId) {
        try { localStorage.setItem(keyPrefix + 'conversation', data.conversationId); } catch {}
      }
      addMessage('ai', data.reply || 'I could not prepare a reply.');
      if (data.leadCaptured) status.textContent = 'Your contact details were saved for follow-up.';
      else if (data.handoffEmail) status.textContent = 'Human support: ' + data.handoffEmail;
      else status.textContent = 'Powered by SUMMECA SiteAgent AI';
    } catch (error) {
      addMessage('ai', error instanceof Error ? error.message : 'Unable to connect right now.');
      status.textContent = 'Please try again.';
    } finally {
      sendButton.disabled = false;
      messageInput.focus();
    }
  });
})();
