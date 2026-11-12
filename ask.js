// Ask Bhunte — the website's Nepali question companion (Phase 2, 2026-11-12).
//
// Two mounts, driven by data attributes so each page just drops in a div:
//   <div data-ask="box"></div>      the question box (home + lesson pages)
//   <div data-ask="history"></div>  the parent history view (dashboard)
//
// The box talks to POST /accounts/children/{id}/ask on the Fly backend
// (Phase 1). The server enforces sign-in, ownership, the daily cap and
// the kill switch; this file only renders states honestly:
//   signed out / no child -> ask a grown-up to sign in
//   429                   -> Bhunte's own "come back tomorrow" message
//   502/503/network       -> a plain try-again, never a fake answer
// The vendor never hears about this page: the request carries only the
// question; the child's identity stays in the session header, which
// only our own server reads.
(function () {
  "use strict";

  // Model answers use **bold** markdown. Escape FIRST with the shared
  // esc() from auth.js (model text is untrusted), then turn **x** into
  // <strong> and newlines into <br> — nothing else is interpreted.
  function fmt(text) {
    return esc(text)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  }

  // Like GharAuth.api, but keeps the HTTP status and the server's
  // friendly `detail` message, which the box needs (the daily-cap and
  // not-available replies ARE the product copy for those states).
  async function apiRaw(path, method, body) {
    const res = await fetch(GHAR_API + path, {
      method: method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(GharAuth.session()
          ? { Authorization: "Bearer " + GharAuth.session() }
          : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    let data = null;
    try {
      data = await res.json();
    } catch (e) {}
    return { ok: res.ok, status: res.status, data: data || {} };
  }

  function headHtml() {
    return (
      '<div class="ask-head"><span class="ask-dog" aria-hidden="true">🐶</span>' +
      "<h3>Ask Bhunte</h3>" +
      '<span class="ask-ai-badge" title="Bhunte is an AI helper">✨ AI</span></div>' +
      '<p class="ask-disclosure">Bhunte is an AI helper who answers from ' +
      "Ghar's lessons. These chats are saved to the account and can be " +
      "read any time in the dashboard.</p>"
    );
  }

  function renderBox(mount) {
    mount.innerHTML = '<div class="ask-card">' + headHtml() + '<div class="ask-body"></div></div>';
    const body = mount.querySelector(".ask-body");

    if (!GharAuth.signedIn() || !GharAuth.childId()) {
      body.innerHTML =
        '<p class="ask-note"><a href="signin.html">Sign in</a> — or have a parent ' +
        "sign in — so you can ask Bhunte a question.</p>";
      return;
    }

    body.innerHTML =
      '<form class="ask-form">' +
      '<input class="ask-input" type="text" maxlength="300" autocomplete="off" ' +
      'placeholder="Ask about a Nepali word…">' +
      '<button class="ask-btn" type="submit">Ask</button></form>' +
      '<div class="ask-answer" hidden></div>' +
      '<p class="ask-meta"></p>';

    const form = body.querySelector(".ask-form");
    const input = body.querySelector(".ask-input");
    const btn = body.querySelector(".ask-btn");
    const answer = body.querySelector(".ask-answer");
    const meta = body.querySelector(".ask-meta");

    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      btn.disabled = true;
      input.disabled = true;
      answer.hidden = false;
      answer.textContent = "Bhunte is thinking…";
      meta.textContent = "";
      try {
        const r = await apiRaw(
          "/accounts/children/" + GharAuth.childId() + "/ask",
          "POST",
          { question: q }
        );
        if (r.ok) {
          answer.innerHTML = fmt(r.data.answer || "");
          input.value = "";
          const left = r.data.remaining_today;
          meta.textContent =
            typeof left === "number"
              ? left > 0
                ? left + (left === 1 ? " question" : " questions") + " left today"
                : "That was today's last question — more tomorrow!"
              : "";
        } else if (r.status === 401) {
          // Session expired or was signed out elsewhere.
          renderBox(mount);
          return;
        } else if (r.status === 429 || r.status === 503 || r.status === 502) {
          answer.textContent =
            r.data.detail || "Bhunte couldn't think of an answer — please try again!";
        } else {
          answer.textContent = "Bhunte couldn't think of an answer — please try again!";
        }
      } catch (e) {
        answer.textContent =
          "Bhunte couldn't be reached — check your connection and try again!";
      } finally {
        btn.disabled = false;
        input.disabled = false;
        input.focus();
      }
    });
  }

  async function renderHistory(mount) {
    mount.innerHTML =
      '<div class="ask-card">' + headHtml() + '<div class="ask-history-body">' +
      '<p class="ask-note">Loading…</p></div></div>';
    const body = mount.querySelector(".ask-history-body");
    if (!GharAuth.signedIn()) {
      body.innerHTML = '<p class="ask-note">Sign in to see Ask Bhunte history.</p>';
      return;
    }
    let me;
    try {
      me = await GharAuth.api("/accounts/me");
    } catch (e) {
      body.innerHTML =
        '<p class="ask-note">Couldn\'t load Ask Bhunte history. Check your connection and refresh.</p>';
      return;
    }
    const kids = (me && me.children) || [];
    if (!kids.length) {
      body.innerHTML = '<p class="ask-note">No children yet.</p>';
      return;
    }
    let html = "";
    for (const kid of kids) {
      html += '<div class="ask-child"><h4>' + esc(kid.name) + "</h4>";
      let hist = [];
      try {
        const r = await apiRaw(
          "/accounts/children/" + kid.id + "/ask-history?limit=50"
        );
        if (r.ok) hist = r.data.history || [];
      } catch (e) {}
      if (!hist.length) {
        html += '<p class="ask-note">No questions yet.</p>';
      } else {
        for (const item of hist) {
          const when = new Date(item.created_at * 1000).toLocaleDateString(
            undefined,
            { month: "short", day: "numeric" }
          );
          html +=
            '<div class="ask-qa"><p class="ask-q">' +
            esc(item.question) +
            ' <span class="ask-when">' +
            esc(when) +
            '</span></p><p class="ask-a">' +
            fmt(item.answer) +
            "</p></div>";
        }
      }
      html += "</div>";
    }
    body.innerHTML = html;
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!window.GharAuth) return;
    document.querySelectorAll('[data-ask="box"]').forEach(renderBox);
    document.querySelectorAll('[data-ask="history"]').forEach(renderHistory);
  });
})();
