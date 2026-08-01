/**
 * Primary path: copy Cookie from Network (HttpOnly weeek_session is invisible to document.cookie).
 * Helper builds JSON for weeek_session_import.
 */
export const WEEEK_SESSION_CONSOLE_SNIPPET = String.raw`(() => {
  // weeek_session is HttpOnly — document.cookie cannot see it.
  // Use Network tab Cookie header, then call:  weeekExportSession('<Cookie header>')
  function weeekExportSession(cookieHeader, workspaceId) {
    const raw = String(cookieHeader || '').trim();
    if (!raw) {
      console.error('Paste the Cookie request header value from Network.');
      return;
    }
    if (!/weeek_session=/.test(raw)) {
      console.error('Cookie string has no weeek_session=. Copy the full Cookie header from the api.weeek.net request.');
      return;
    }
    const parts = raw.split(';').map(s => s.trim()).filter(Boolean);
    const map = Object.fromEntries(parts.map(p => {
      const i = p.indexOf('=');
      return [p.slice(0, i), p.slice(i + 1)];
    }));
    const ws = Number(workspaceId || map.workspace_id);
    if (!Number.isFinite(ws)) {
      console.error('workspaceId missing. Call weeekExportSession(cookie, YOUR_WORKSPACE_ID)');
      return;
    }
    const want = (n) => n === 'weeek_session' || n.startsWith('remember_app_') || n === 'workspace_id' || n === 'user_id' || n === 'cid';
    const picked = parts.filter(p => want(p.split('=')[0]));
    const payload = { workspaceId: ws, cookie: (picked.length ? picked : parts).join('; '), userId: map.user_id || undefined };
    const text = JSON.stringify(payload);
    const done = () => {
      console.log('%cSession JSON ready — paste it into Cursor chat', 'color:#6C78F4;font-weight:bold');
      console.log(text);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(done);
    else done();
    return payload;
  }
  globalThis.weeekExportSession = weeekExportSession;
  console.log([
    'Weeek session helper installed: weeekExportSession(cookieHeader)',
    '',
    '1) DevTools → Network → open any task (or reload)',
    '2) Find request: api.weeek.net/ws/.../tm/tasks/...',
    '3) Headers → Request Headers → Cookie → copy value',
    '4) Here run:  weeekExportSession(\"PASTE_COOKIE_HERE\")',
    '5) Paste the printed JSON into Cursor chat',
  ].join('\\n'));
  return weeekExportSession;
})();`;

export function authOnboardingMarkdown(sessionFilePath: string): string {
  return [
    "## Session required for task comments",
    "",
    "Comments need a browser session cookie. `weeek_session` is **HttpOnly**, so a simple `document.cookie` snippet will not see it.",
    "",
    "### Steps (Network → Cookie)",
    "1. Open https://app.weeek.net and log in",
    "2. DevTools → **Network** → open any task (so `api.weeek.net/ws/.../tm/tasks/...` appears)",
    "3. Click that request → **Headers** → **Request Headers** → **Cookie** → copy the whole value",
    "4. DevTools → **Console** → paste the helper below → Enter, then run:",
    "   `weeekExportSession(\"PASTE_COOKIE_HERE\")`",
    "5. Paste the printed JSON into Cursor chat (agent will call `weeek_session_import`)",
    "",
    "Or build JSON yourself and paste into chat:",
    "```json",
    '{ "workspaceId": 123456, "cookie": "<Cookie header from Network>" }',
    "```",
    "",
    `Session file (after import): \`${sessionFilePath}\``,
    "",
    "### Console helper",
    "```js",
    WEEEK_SESSION_CONSOLE_SNIPPET,
    "```",
    "",
    "_Cookie = your login session. Do not commit or share it. If leaked, log out of Weeek / change password._",
  ].join("\n");
}
