/* GharUnlock — the $7.99 one-time unlock offer modal.
   Used by the header Unlock button and the post-lesson prompt on the
   home page. States plainly that the payment is ONE-TIME (no
   subscription) before the parent is sent to Stripe Checkout. */
(function () {
  let overlay = null;

  function onKey(e) { if (e.key === "Escape") close(); }

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.removeEventListener("keydown", onKey);
  }

  function show() {
    if (overlay) return;
    const signedIn = !!(window.GharAuth && GharAuth.signedIn());
    const wrap = document.createElement("div");
    wrap.innerHTML =
      '<div class="unlock-overlay" role="dialog" aria-modal="true" aria-label="Unlock Ghar Premium">' +
        '<div class="unlock-card">' +
          '<button class="unlock-x" type="button" aria-label="Close">✕</button>' +
          '<div class="unlock-emoji">🔓</div>' +
          '<h2 class="unlock-title">Unlock everything</h2>' +
          '<p class="unlock-price">$7.99 <span>one-time payment</span></p>' +
          '<p class="unlock-note">No subscription. No renewals.<br>Pay once — yours forever.</p>' +
          '<ul class="unlock-list">' +
            '<li>✓ All 22 lessons</li>' +
            '<li>✓ Every game — Bagh-Chal, Chess &amp; more</li>' +
            '<li>✓ Writing practice &amp; tracing</li>' +
            '<li>✓ Streaks, missions &amp; leagues</li>' +
            '<li>✓ 100 Bhunte questions a day</li>' +
          '</ul>' +
          (signedIn
            ? '<button class="unlock-go" type="button">Unlock now — $7.99 one time</button>'
            : '<a class="unlock-go unlock-go-link" href="signin.html">Sign in to unlock →</a>') +
          '<p class="unlock-err" hidden></p>' +
          '<button class="unlock-later" type="button">Not now</button>' +
        '</div>' +
      '</div>';
    overlay = wrap.firstElementChild;
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.querySelector(".unlock-x").addEventListener("click", close);
    overlay.querySelector(".unlock-later").addEventListener("click", close);
    if (signedIn) {
      const go = overlay.querySelector(".unlock-go");
      const err = overlay.querySelector(".unlock-err");
      go.addEventListener("click", async () => {
        err.hidden = true;
        go.disabled = true;
        go.textContent = "Taking you to secure checkout…";
        try {
          await GharAuth.startCheckout();
        } catch (e) {
          go.disabled = false;
          go.textContent = "Unlock now — $7.99 one time";
          err.textContent = "Could not start checkout — check your connection and try again.";
          err.hidden = false;
        }
      });
    }
    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
  }

  // Any element carrying [data-unlock-open] opens the offer modal.
  // Wired here, on DOMContentLoaded, so callers never race the parser:
  // page scripts that resolve auth state early (a guest's pull()
  // settles in a microtask) can run before later sections exist.
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-unlock-open]").forEach(function (b) {
      b.addEventListener("click", function () { show(); });
    });
  });

  window.GharUnlock = { show: show, close: close };
})();
