// GharFriends — asynchronous friend games (website, 2026-11-12).
// Board games (chess, Bagh-Chal) alternate moves through the server;
// duels (quiz, balloon, memory, scramble, places) give both players
// the identical server-issued challenge and compare score + time.
// Opponents come only from the learner's leaderboard group.
(function () {
  const API_BASE = "https://backend-patient-wave-3724.fly.dev";
  const GAMES = {
    chess:    { name: "Chess", icon: "♟️", page: "chess.html", param: "game", board: true,
                sides: [["random", "🎲 Random side"], ["white", "♔ I'll be White"], ["black", "♚ I'll be Black"]] },
    baghchal: { name: "Bagh-Chal", icon: "🐅", page: "bagh-chal.html", param: "game", board: true,
                sides: [["random", "🎲 Random side"], ["goats", "🐐 I'll be Goats"], ["tigers", "🐅 I'll be Tigers"]] },
    quiz:     { name: "Quiz Blitz duel", icon: "⚡", page: "quiz.html", param: "duel" },
    balloon:  { name: "Balloon Pop duel", icon: "🎈", page: "balloon-pop.html", param: "duel" },
    memory:   { name: "Memory Match duel", icon: "🧠", page: "memory-match.html", param: "duel" },
    scramble: { name: "Word Scramble duel", icon: "🔤", page: "word-scramble.html", param: "duel" },
    places:   { name: "Places Quiz duel", icon: "🗺️", page: "places-quiz.html", param: "duel" },
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
  function childId() {
    return (window.GharAuth && GharAuth.signedIn() && GharAuth.childId()) || "";
  }
  async function api(path, method, body) {
    const res = await fetch(API_BASE + path, {
      method: method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(GharAuth.session() ? { "Authorization": "Bearer " + GharAuth.session() } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* empty body */ }
    if (!res.ok) {
      const err = new Error((data && data.detail) || ("request failed: " + res.status));
      err.status = res.status;
      throw err;
    }
    return data;
  }
  const base = (cid) => "/accounts/children/" + cid;

  const friends = (cid) => api(base(cid) + "/friends");
  const games = (cid) => api(base(cid) + "/friend-games");
  const create = (cid, opponentId, game, side) =>
    api(base(cid) + "/friend-games", "POST", { opponent_child_id: opponentId, game: game, side: side || undefined });
  const get = (cid, gid) => api(base(cid) + "/friend-games/" + gid);
  const move = (cid, gid, mv) => api(base(cid) + "/friend-games/" + gid + "/move", "POST", { move: mv });
  const result = (cid, gid, score, timeMs) =>
    api(base(cid) + "/friend-games/" + gid + "/result", "POST", { score: score, time_ms: timeMs });
  const resign = (cid, gid) => api(base(cid) + "/friend-games/" + gid + "/resign", "POST", {});
  const rematch = (cid, gid) => api(base(cid) + "/friend-games/" + gid + "/rematch", "POST", {});

  // Claim any XP this child has won in friend games and apply it the
  // same way solo play does: bump the lifetime total, then push.
  async function claimRewards(cid) {
    try {
      const r = await api(base(cid) + "/game-rewards");
      if (!r || !r.unclaimed || !r.unclaimed.length) return 0;
      const d = await api(base(cid) + "/game-rewards/claim", "POST",
        { game_ids: r.unclaimed.map((x) => x.game_id) });
      const xp = (d && d.claimed_xp) || 0;
      if (xp > 0) {
        const total = (parseInt(localStorage.getItem("ghar.xp.total") || "0", 10) || 0) + xp;
        localStorage.setItem("ghar.xp.total", String(total));
        if (window.GharAuth && GharAuth.pushTotals) GharAuth.pushTotals().catch(() => {});
        if (window.GharAuth && GharAuth.shareLeaderboard) GharAuth.shareLeaderboard().catch(() => {});
      }
      return xp;
    } catch (e) { return 0; }
  }

  function playUrl(g) {
    const meta = GAMES[g.game];
    return meta.page + "?" + meta.param + "=" + encodeURIComponent(g.id);
  }
  function statusText(g) {
    const nick = g.opponent.nickname || "your friend";
    if (g.status === "abandoned") return "💤 Closed — no play for 14 days";
    if (g.status === "finished") {
      if (g.winner === "me") return "🏆 You won!";
      if (g.winner === "draw") return "🤝 It's a draw";
      return "🏆 " + nick + " won";
    }
    if (g.kind === "board") return g.my_turn ? "🟢 Your move" : "⏳ Waiting for " + nick;
    if (!g.i_played) return "⚔️ Your turn to play";
    return "⏳ Waiting for " + nick + " to play";
  }
  function scoreText(g) {
    if (g.kind !== "duel" || !g.my_result) return "";
    let s = "You: " + g.my_result.score;
    if (g.opponent_result) s += " · " + (g.opponent.nickname || "Friend") + ": " + g.opponent_result.score;
    return s;
  }

  function gameRow(g, opts) {
    opts = opts || {};
    const meta = GAMES[g.game];
    const row = document.createElement("div");
    row.className = "fg-row";
    const left = document.createElement("div");
    left.className = "fg-row-main";
    left.innerHTML = "<div class=\"fg-row-title\">" + meta.icon + " " + esc(meta.name) +
      " <span class=\"fg-vs\">vs " + esc(g.opponent.nickname || "Friend") + "</span></div>" +
      "<div class=\"fg-row-status\">" + esc(statusText(g)) + "</div>" +
      (scoreText(g) ? "<div class=\"fg-row-score\">" + esc(scoreText(g)) + "</div>" : "");
    row.appendChild(left);
    const actions = document.createElement("div");
    actions.className = "fg-row-actions";
    if (!opts.readOnly) {
      if (g.status === "active" && (g.kind === "board" || !g.i_played)) {
        const b = document.createElement("a");
        b.className = "fg-btn";
        b.href = playUrl(g);
        b.textContent = g.kind === "board" ? "Open" : "Play";
        actions.appendChild(b);
      }
      if (g.status !== "active") {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "fg-btn fg-btn-ghost";
        b.textContent = "Rematch";
        b.addEventListener("click", async () => {
          b.disabled = true; b.textContent = "Starting…";
          try {
            const ng = await rematch(childId(), g.id);
            window.location.href = playUrl(ng);
          } catch (e) { b.disabled = false; b.textContent = "Rematch"; }
        });
        actions.appendChild(b);
      }
    }
    row.appendChild(actions);
    return row;
  }

  async function renderHub(el) {
    const cid = childId();
    if (!cid) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = "<div class=\"fg-card\"><h2>🎮 Play with friends</h2>" +
      "<p class=\"fg-note\">Loading your friends and games…</p></div>";
    const claimed = await claimRewards(cid);
    let f;
    try { f = await friends(cid); } catch (e) { f = null; }
    if (f && !f.group_code) {
      // The leaderboard page may hold a local group the server identity
      // hasn't got yet — push it once and look again.
      const code = (localStorage.getItem("ghar.lb.code") || "").trim();
      const nick = (localStorage.getItem("ghar.lb.nickname") || "").trim();
      if (code && nick) {
        try {
          await GharAuth.api(base(cid) + "/leaderboard-identity", "POST",
            { group_code: code, nickname: nick });
          f = await friends(cid);
        } catch (e) { /* fall through */ }
      }
    }
    const card = document.createElement("div");
    card.className = "fg-card";
    card.innerHTML = "<h2>🎮 Play with friends</h2>";
    if (claimed > 0) {
      const note = document.createElement("p");
      note.className = "fg-xp-note";
      note.textContent = "⭐ +" + claimed + " XP from friend games added to your total!";
      card.appendChild(note);
    }
    if (!f || !f.group_code) {
      const p = document.createElement("p");
      p.className = "fg-note";
      p.textContent = "Your leaderboard group is your friends list. Create or join a group above, then come back here to challenge each other.";
      card.appendChild(p);
      el.innerHTML = ""; el.appendChild(card);
      return;
    }
    const others = (f.members || []).filter((m) => !m.is_me);
    if (!others.length) {
      const p = document.createElement("p");
      p.className = "fg-note";
      p.textContent = "Nobody else is in your group yet. Share your group code — when a friend joins, you can challenge them to chess, Bagh-Chal and duels right here.";
      card.appendChild(p);
    }
    others.forEach((m) => {
      const row = document.createElement("div");
      row.className = "fg-challenge";
      const name = document.createElement("span");
      name.className = "fg-friend-name";
      name.textContent = "👤 " + (m.nickname || "Friend");
      const sel = document.createElement("select");
      sel.className = "fg-select";
      Object.keys(GAMES).forEach((k) => {
        const o = document.createElement("option");
        o.value = k; o.textContent = GAMES[k].icon + " " + GAMES[k].name;
        sel.appendChild(o);
      });
      const side = document.createElement("select");
      side.className = "fg-select";
      const syncSide = () => {
        const meta = GAMES[sel.value];
        side.innerHTML = "";
        (meta.sides || [["", "—"]]).forEach(([v, label]) => {
          const o = document.createElement("option");
          o.value = v; o.textContent = label;
          side.appendChild(o);
        });
        side.hidden = !meta.board;
      };
      sel.addEventListener("change", syncSide);
      syncSide();
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fg-btn";
      btn.textContent = "Challenge";
      btn.addEventListener("click", async () => {
        btn.disabled = true; btn.textContent = "Starting…";
        try {
          const g = await create(cid, m.child_id, sel.value, side.hidden ? undefined : side.value);
          window.location.href = playUrl(g);
        } catch (e) {
          btn.disabled = false; btn.textContent = "Challenge";
          alert(e.message || "Could not start the game.");
        }
      });
      row.appendChild(name); row.appendChild(sel); row.appendChild(side); row.appendChild(btn);
      card.appendChild(row);
    });
    const listWrap = document.createElement("div");
    card.appendChild(listWrap);
    el.innerHTML = ""; el.appendChild(card);
    const draw = async () => {
      listWrap.innerHTML = "";
      let data = null;
      try { data = await games(cid); } catch (e) { /* offline */ }
      const head = document.createElement("h3");
      head.className = "fg-subhead";
      head.textContent = "Your games";
      listWrap.appendChild(head);
      if (!data || !data.games || !data.games.length) {
        const p = document.createElement("p");
        p.className = "fg-note";
        p.textContent = "No games yet — challenge a friend above!";
        listWrap.appendChild(p);
        return;
      }
      data.games.forEach((g) => listWrap.appendChild(gameRow(g)));
    };
    await draw();
  }

  async function renderChip(el) {
    const cid = childId();
    if (!cid) { el.hidden = true; return; }
    try {
      const data = await games(cid);
      const list = (data && data.games) || [];
      const myMoves = list.filter((g) => g.status === "active" && g.kind === "board" && g.my_turn).length;
      const myDuels = list.filter((g) => g.status === "active" && g.kind === "duel" && !g.i_played).length;
      if (!myMoves && !myDuels) { el.hidden = true; return; }
      const parts = [];
      if (myMoves) parts.push("♟️ your move in " + myMoves + (myMoves === 1 ? " game" : " games"));
      if (myDuels) parts.push("⚔️ " + myDuels + (myDuels === 1 ? " duel" : " duels") + " waiting");
      el.textContent = "🎮 Friend games: " + parts.join(" · ") + " — tap to play";
      el.hidden = false;
    } catch (e) { el.hidden = true; }
  }

  async function renderChildGames(el, cid) {
    el.innerHTML = "";
    let data = null;
    try { data = await games(cid); } catch (e) { /* offline */ }
    if (!data || !data.games || !data.games.length) {
      el.innerHTML = "<p class=\"fg-note\">No friend games yet.</p>";
      return;
    }
    data.games.forEach((g) => el.appendChild(gameRow(g, { readOnly: true })));
  }

  window.GharFriends = {
    GAMES, esc, childId, api, friends, games, create, get, move, result,
    resign, rematch, claimRewards, playUrl, statusText, renderHub,
    renderChip, renderChildGames,
  };
})();
