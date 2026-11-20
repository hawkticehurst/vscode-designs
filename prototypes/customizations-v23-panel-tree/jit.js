/* V20 — Just-in-time prompts in the chat (after Lad: "front and center in the chat… where they're continuously looking").
   When a running session's agent needs a customization that can't run yet (Work IQ isn't signed in), the ask sits right
   above the input, only while it's needed. Signing in here or in the side panel clears it. */
import { CONNECTIONS, iconHtml, changed } from "./env.js?v=12";
import { toast } from "./panel-shell.js";
import { USAGE } from "./usage.js?v=1";
import { store } from "./scope-store.js";
const { esc } = window.CUST;

const ASKS = {
  "settings-proto": { id: "workiq", why: "The agent wants to read the notes from the Nov 18 Settings IA review." },
};
const skipped = new Set();
let current = null;

function bar(sessionId) {
  const ask = ASKS[sessionId], c = ask && CONNECTIONS.find((x) => x.id === ask.id);
  if (!c || c.state !== "signin" || skipped.has(sessionId)) return null;
  const el = document.createElement("div");
  el.className = "cv-jit jit-bar";
  el.setAttribute("role", "group");
  el.setAttribute("aria-label", `Sign in to ${c.name}`);
  el.innerHTML = `<div class="cv-jit-head">${iconHtml(c, 16)}<div class="cv-jit-text"><div class="cv-jit-title">Sign in to ${esc(c.name)} to continue</div>
      <div class="cv-jit-sub">${esc(ask.why)}</div></div></div>
    <div class="cv-jit-actions"><vsc-button data-jit-signin="${esc(c.id)}">Sign In</vsc-button><vsc-button secondary data-jit-skip>Continue Without</vsc-button></div>`;
  return el;
}
function mount(el, sessionId) {
  current?.remove();
  current = bar(sessionId);
  if (current) el.querySelector(".s-composer")?.prepend(current);
}
function signedIn(id) {
  const c = CONNECTIONS.find((x) => x.id === id);
  if (c) c.state = "ok";
  for (const list of Object.values(USAGE)) for (const u of list) if (u.conn === id && u.wait) { delete u.wait; u.uses = "2 calls"; u.tokens = 6400; u.cost = 0.13; }
  current?.remove(); current = null;
}
document.addEventListener("session-open", (e) => mount(e.detail.el, e.detail.id));
document.addEventListener("session-new", () => { current?.remove(); current = null; });
document.addEventListener("item-signed-in", (e) => signedIn(e.detail.id));
document.getElementById("page").addEventListener("click", (e) => {
  const si = e.target.closest("[data-jit-signin]");
  if (si) { signedIn(si.dataset.jitSignin); changed(); return toast("Signed in to Work IQ. The agent is continuing."); }
  if (e.target.closest("[data-jit-skip]")) {
    if (store.session?.id) skipped.add(store.session.id);
    current?.remove(); current = null;
    toast("The agent will continue without Work IQ. Sign in anytime from Customizations.");
  }
});
