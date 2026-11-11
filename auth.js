// Ghar accounts — shared client for the web.
// The parent signs in with an email magic link; each child has a profile
// and their progress (XP, heard words, quiz free questions) lives on the
// server. When nobody is signed in, the pages keep working from
// localStorage exactly as before (guest mode).
const GHAR_API = "https://backend-patient-wave-3724.fly.dev";
const SESSION_KEY = "ghar.session";
const CHILD_KEY = "ghar.childId";
// Cached copy of the server's unlock flag (GET /accounts/me). The SERVER
// is the source of truth — this is only a display hint so pages can gate
// without waiting on a fetch. refreshUnlock() re-reads it from the server.
const UNLOCK_KEY = "ghar.unlocked";

// Escape text for safe interpolation into innerHTML (pack data, child
// names, nicknames). Escapes & < > " ' — safe in both text and attribute
// contexts. Shared by every page that loads auth.js; pages that don't
// load it (songs.html, rhymes.html) define their own copy.
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

const GharAuth = {
  session() { return localStorage.getItem(SESSION_KEY) || ""; },
  childId() { return localStorage.getItem(CHILD_KEY) || ""; },
  signedIn() { return !!this.session(); },
  signOut() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(CHILD_KEY);
    localStorage.removeItem(UNLOCK_KEY);
    location.href = "signin.html";
  },
  // True if the server has marked this family unlocked (Stripe $7.99
  // one-time payment). Reads the cached flag; refreshUnlock() re-reads
  // it from the server. Guests (never signed in) are never unlocked.
  isUnlocked() { return localStorage.getItem(UNLOCK_KEY) === "1"; },
  // Re-read the unlock flag from GET /accounts/me and cache it. Returns
  // the server value. Never throws — on any failure it returns the
  // cached value so a network blip never locks a paying family out.
  async refreshUnlock() {
    if (!this.signedIn()) return false;
    try {
      const me = await this.api("/accounts/me");
      const unlocked = !!me.unlocked;
      localStorage.setItem(UNLOCK_KEY, unlocked ? "1" : "0");
      return unlocked;
    } catch (e) { return this.isUnlocked(); }
  },
  // Start the Stripe Checkout flow for the $7.99 one-time family unlock.
  // Returns false when not signed in (the caller prompts sign-in first).
  // On success the browser leaves for Stripe Checkout; on return the
  // site re-reads the unlock flag from the server (?unlocked=1).
  async startCheckout() {
    if (!this.signedIn()) return false;
    const d = await this.api("/accounts/checkout", "POST", {});
    if (!d.checkout_url) throw new Error("Checkout did not return a payment link");
    location.href = d.checkout_url;
    return true;
  },
  async api(path, method, body) {
    const res = await fetch(GHAR_API + path, {
      method: method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(this.session() ? { "Authorization": "Bearer " + this.session() } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) throw new Error("request failed: " + res.status);
    return res.json();
  },
  xp() { return parseInt(localStorage.getItem("ghar.xp.total") || "0", 10) || 0; },
  // ---- Spendable XP balance (matches the server's xp - xp_spent) ----
  // ghar.xp.total is the LIFETIME total earned (never decreases — it is
  // what /progress stores and what bones migrate from). ghar.xp.spent is
  // the total spent (a local cache of the server's xp_spent). The wallet
  // the child can actually spend is spendable() = total - spent.
  spent() { return parseInt(localStorage.getItem("ghar.xp.spent") || "0", 10) || 0; },
  spendable() { return Math.max(this.xp() - this.spent(), 0); },
  // Spend n XP from the wallet through the server (POST /spend). The
  // server is the source of truth: it checks the balance atomically and
  // dedupes on the idempotency key, so a retry or a double-tap can never
  // deduct twice. Returns {ok, spendable} or {ok:false, reason}.
  // Guests (not signed in) spend locally only. A failed validation never
  // deducts; a network failure retries once with the SAME key.
  async spend(amount, reason, key) {
    amount = Math.floor(amount) || 0;
    if (amount <= 0) return { ok: false, reason: "bad amount" };
    // Guest: local-only (no server to record it on).
    if (!this.signedIn() || !this.childId()) {
      if (this.spendable() < amount) return { ok: false, reason: "not enough" };
      localStorage.setItem("ghar.xp.spent", String(this.spent() + amount));
      return { ok: true, spendable: this.spendable(), local: true };
    }
    if (this.spendable() < amount) return { ok: false, reason: "not enough" };
    key = key || ((window.crypto && crypto.randomUUID) ? crypto.randomUUID()
      : ("spend-" + Date.now() + "-" + Math.floor(Math.random() * 1e9)));
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const d = await this.api("/accounts/children/" + this.childId() + "/spend", "POST",
          { amount, reason: reason || "", key });
        // Server is authoritative: take its spent + lifetime totals.
        localStorage.setItem("ghar.xp.spent", String(d.xp_spent || 0));
        if (typeof d.xp_earned === "number") {
          localStorage.setItem("ghar.xp.total", String(Math.max(this.xp(), d.xp_earned)));
        }
        return { ok: true, spendable: d.spendable, deducted: d.deducted || 0, xp_spent: d.xp_spent, xp_earned: d.xp_earned };
      } catch (e) {
        const msg = String((e && e.message) || "");
        // A 4xx is a definitive rejection (not enough XP, bad key) — never retry.
        const m = msg.match(/request failed: (\d+)/);
        if (m && parseInt(m[1], 10) >= 400 && parseInt(m[1], 10) < 500) {
          // Refresh the local balance from the server so the UI stops
          // showing XP another device already spent.
          if (m[1] === "422") { try { await this._refreshBalance(); } catch (e2) {} }
          return { ok: false, reason: m[1] === "422" ? "not enough" : "rejected" };
        }
        if (attempt === 0) continue; // network blip / 5xx — retry once, same key
        return { ok: false, reason: "network" };
      }
    }
    return { ok: false, reason: "network" };
  },
  // Re-read the server's lifetime + spent totals (used after a spend is
  // rejected, so the UI stops showing XP another device already spent).
  async _refreshBalance() {
    if (!this.signedIn() || !this.childId()) return false;
    try {
      const p = await this.api("/accounts/children/" + this.childId() + "/progress");
      if (typeof p.xp === "number") {
        localStorage.setItem("ghar.xp.total", String(Math.max(this.xp(), p.xp)));
      }
      if (typeof p.xp_spent === "number") {
        localStorage.setItem("ghar.xp.spent", String(p.xp_spent));
      }
      return true;
    } catch (e) { return false; }
  },
  // Reconcile the local spend record with the server's. Called from
  // pull() after /progress. Two layers:
  // (1) Local spending the server never saw (guest/offline): if this
  //     browser's spent total is higher than the server's, record the
  //     difference as a "reconcile" spend (deterministic key, so a retry
  //     cannot double it). The server is otherwise authoritative.
  // (2) One-time, pre-fix spending: before this build the client never
  //     told the server about a spend, so the server's xp_spent is 0
  //     even though the child owns shop items and fed/taught Suga. On
  //     the first pull (flag ghar.xp.reconciled), compute the spend the
  //     synced records prove — shop items owned (the first free_used,
  //     in purchase order, were free) + 5 XP per Suga feed + 10 XP per
  //     word taught — and record anything the server hasn't seen.
  //     Mimic and Bagh-Chal hint spends were never counted anywhere, so
  //     those are forgiven (not deducted). The result is clamped so
  //     spendable can never go below 0.
  async syncSpends(serverXp, serverSpent) {
    if (!this.signedIn() || !this.childId()) return false;
    serverXp = Math.max(serverXp || 0, 0);
    serverSpent = Math.max(serverSpent || 0, 0);
    const localSpent = this.spent();
    let unrecorded = Math.max(0, localSpent - serverSpent);
    let layer2done = true;
    const reconciled = localStorage.getItem("ghar.xp.reconciled") === "1";
    if (!reconciled && typeof SHOP !== "undefined") {
      try {
        const expected = await this._expectedSpendFromRecords();
        if (typeof expected === "number") {
          unrecorded = Math.max(unrecorded, expected - serverSpent);
        } else {
          layer2done = false;
        }
      } catch (e) { layer2done = false; }
    } else if (!reconciled) {
      layer2done = false; // no catalog on this page — try again on shop/My Ghar
    }
    if (unrecorded > 0) {
      unrecorded = Math.min(unrecorded, Math.max(serverXp - serverSpent, 0));
    }
    if (unrecorded > 0) {
      const key = "reconcile:" + this.childId() + ":" + serverSpent + ":" + localSpent;
      const r = await this.spend(unrecorded, "reconcile", key);
      if (!r.ok) return false; // network — keep the flag unset, retry next pull
      serverSpent = this.spent(); // spend() already set it from the server
    } else {
      // Nothing unrecorded — the server's spent total is authoritative.
      localStorage.setItem("ghar.xp.spent", String(serverSpent));
    }
    if (layer2done) localStorage.setItem("ghar.xp.reconciled", "1");
    return true;
  },
  // One-time migration helper: how much XP do the synced records prove
  // this child already spent (before spends were recorded server-side)?
  // Shop items owned (the first free_used, in purchase order, were free)
  // + 5 XP per Suga feed + 10 XP per word taught. Returns a number, or
  // null when the records can't be read.
  async _expectedSpendFromRecords() {
    if (typeof SHOP === "undefined") return null;
    const cid = this.childId();
    if (!cid) return null;
    const shop = await this.api("/accounts/children/" + cid + "/shop");
    const suga = await this.api("/accounts/children/" + cid + "/suga");
    const mg = await this.api("/accounts/children/" + cid + "/myghar");
    if (!shop || !Array.isArray(shop.items) || !suga || !mg) return null;
    const price = {};
    SHOP.forEach(it => { price[it.id] = it.price || 0; });
    // Freebies: the first free_used owned items, in purchase order (GET
    // /shop returns purchase order). Use the max of the server's and this
    // browser's count — free_used is max-merged, so either side can lag.
    const localFree = parseInt(localStorage.getItem("ghar.shop.freeUsed") || "0", 10) || 0;
    const freeUsed = Math.min(Math.max(mg.free_used || 0, localFree), shop.items.length);
    let total = 0;
    shop.items.forEach((id, i) => { if (i >= freeUsed) total += (price[id] || 0); });
    total += 5 * (suga.fed_count || 0);
    total += 10 * ((suga.taught || []).length);
    return total;
  },
  // ---- Bones: the dog's growth counter (matches the app's bones) ----
  // Bones only ever grow: every XP earned anywhere adds a bone, and
  // spending XP never takes one back — so the dog can never shrink.
  // Bones are incremented AT each XP award site (addBones), never derived
  // from the XP total: the total falls when XP is spent and rises again
  // on the next server pull, so a delta would double-count refunded XP.
  // Migration: the first call sets bones to the current XP total (after
  // pull() merges it with the server's lifetime total), so no existing
  // dog shrinks on deploy. The server copy lives in the myghar row
  // (max-merged), so a stale device can never lower it.
  bones() { return parseInt(localStorage.getItem("ghar.dog.bones") || "0", 10) || 0; },
  syncBones() {
    if (localStorage.getItem("ghar.dog.bonesInit") !== "1") {
      localStorage.setItem("ghar.dog.bones", String(this.xp()));
      localStorage.setItem("ghar.dog.bonesInit", "1");
      // Push the migrated value up so other devices start from it too.
      if (this.signedIn() && this.childId()) {
        this.api("/accounts/children/" + this.childId() + "/myghar", "POST", { bones: this.bones() }).catch(() => {});
      }
    }
    return this.bones();
  },
  // Add n bones for n XP just earned. Fire-and-forget server push (the
  // myghar row max-merges, so a stale device can never lower it).
  addBones(n) {
    n = Math.floor(n) || 0;
    if (n <= 0) return this.bones();
    const b = this.bones() + n;
    localStorage.setItem("ghar.dog.bones", String(b));
    if (this.signedIn() && this.childId()) {
      this.api("/accounts/children/" + this.childId() + "/myghar", "POST", { bones: b }).catch(() => {});
    }
    return b;
  },
  quizFreeUsed() { return parseInt(localStorage.getItem("ghar.quiz.freeUsed") || "0", 10) || 0; },
  heard(deckId) {
    try { return JSON.parse(localStorage.getItem("ghar.heard." + deckId) || "[]"); }
    catch (e) { return []; }
  },
  // Pull the active child's server progress into localStorage (so every
  // page shows the account's progress). Called on page load when signed in.
  async pull() {
    if (!this.signedIn()) return false;
    // Auto-select the child when there is exactly one: the child choice is
    // stored per browser (localStorage), so a second browser/session that
    // never clicked "Learn as…" has no child selected and every sync push
    // silently does nothing ("no child selected"). If the family has a
    // single child there is nothing to choose — pick them automatically.
    if (!this.childId()) {
      try {
        const me = await this.api("/accounts/me");
        const kids = (me && me.children) || [];
        if (kids.length === 1 && kids[0].id) {
          localStorage.setItem(CHILD_KEY, kids[0].id);
        } else {
          return false;
        }
      } catch (e) { return false; }
    }
    const p = await this.api("/accounts/children/" + this.childId() + "/progress");
    // Merge, never wipe: the server can be stale (or 0) while this device
    // holds newer progress earned offline or before sign-in. Keep the best
    // of both, then push it back so the server catches up instead of
    // clobbering the local progress on the next load.
    const mergedXp = Math.max(this.xp(), p.xp || 0);
    localStorage.setItem("ghar.xp.total", String(mergedXp));
    // Spendable balance: the server is the source of truth (xp_spent),
    // NOT max-merged with the lifetime total — max-merging here is what
    // used to restore spent XP on every page load (the refund bug).
    // syncSpends reconciles any local spending the server hasn't seen,
    // then the local spent total follows the server.
    try { await this.syncSpends(mergedXp, p.xp_spent || 0); } catch (e) {}
    // Bones migrate from the merged (lifetime) total on first call, so a
    // signed-in child starts at lifetime XP, not the spendable balance.
    this.syncBones();
    const mergedQuiz = Math.max(this.quizFreeUsed(), p.quiz_free_used || 0);
    localStorage.setItem("ghar.quiz.freeUsed", String(mergedQuiz));
    const heard = p.heard || {};
    Object.keys(heard).forEach(deckId => {
      const merged = Array.from(new Set([...(this.heard(deckId) || []), ...(heard[deckId] || [])]));
      localStorage.setItem("ghar.heard." + deckId, JSON.stringify(merged));
    });
    if (mergedXp !== (p.xp || 0) || mergedQuiz !== (p.quiz_free_used || 0)) {
      try { await this.pushTotals(); } catch (e) {}
    }
    // The streak + daily challenge sync alongside progress, so every page
    // that pulls progress also pulls the streak (added 2026-11-09).
    try { if (window.GharStreak) await GharStreak.pull(); } catch (e) {}
    return true;
  },
  // Push one deck's heard list plus the child's XP and quiz counter up to
  // the server. Called after any progress change. Silent when signed out.
  async push(deckId) {
    if (!this.signedIn() || !this.childId()) return false;
    await this.api("/accounts/children/" + this.childId() + "/progress", "POST", {
      deck_id: deckId,
      heard: this.heard(deckId),
      xp: this.xp(),
      quiz_free_used: this.quizFreeUsed(),
    });
    return true;
  },
  // Push just the child's XP and quiz counter (no deck). Used by the quiz,
  // sentences, and builder pages, which award XP but don't belong to a deck.
  async pushTotals() {
    if (!this.signedIn() || !this.childId()) return false;
    await this.api("/accounts/children/" + this.childId() + "/progress", "POST", {
      xp: this.xp(),
      quiz_free_used: this.quizFreeUsed(),
    });
    return true;
  },
  // Share the child's current stats to their leaderboard group, if they are
  // in one. Silent no-op when there is no group or nickname yet, and it
  // never throws — pages call it fire-and-forget after any XP/stat change
  // so the board stays current without a manual "Share my score" tap.
  async shareLeaderboard() {
    const code = (localStorage.getItem("ghar.lb.code") || "").trim().toUpperCase();
    const nickname = (localStorage.getItem("ghar.lb.nickname") || "").trim();
    if (!code || !nickname) return false;
    let missions = 0;
    try {
      const c = JSON.parse(localStorage.getItem("ghar.missions.completed") || "[]");
      const v = JSON.parse(localStorage.getItem("ghar.missions.verified") || "[]");
      missions = new Set([...c, ...v]).size;
    } catch (e) { missions = 0; }
    await fetch(GHAR_API + "/leaderboard/score", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.session() ? { "Authorization": "Bearer " + this.session() } : {}),
      },
      body: JSON.stringify({
        group_code: code,
        nickname: nickname,
        // The leaderboard shares the spendable balance, matching the app
        // (where totalXP is the wallet and drops when XP is spent).
        xp: this.spendable(),
        quiz_streak_best: parseInt(localStorage.getItem("ghar.quiz.streakBest") || "0", 10) || 0,
        quiz_correct_total: parseInt(localStorage.getItem("ghar.quiz.correctTotal") || "0", 10) || 0,
        missions_done: missions,
      }),
    });
    return true;
  },
  // Guest carry-over: when the server has nothing for this child yet but
  // the browser has guest progress, push the browser's progress up so
  // nothing is lost on signup. Returns true if it carried anything over.
  async carryOver() {
    if (!this.signedIn() || !this.childId()) return false;
    const p = await this.api("/accounts/children/" + this.childId() + "/progress");
    const heard = p.heard || {};
    const serverEmpty = p.xp === 0 && Object.keys(heard).length === 0;
    if (!serverEmpty) return false;
    const localDecks = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("ghar.heard.")) localDecks.push(k.slice("ghar.heard.".length));
    }
    if (this.xp() === 0 && localDecks.length === 0) return false;
    for (const deckId of localDecks) await this.push(deckId);
    if (localDecks.length === 0) {
      await this.api("/accounts/children/" + this.childId() + "/progress", "POST", {
        deck_id: "alphabet", heard: [], xp: this.xp(), quiz_free_used: this.quizFreeUsed(),
      });
    }
    return true;
  },
};
// Top-level const does NOT attach to window, so expose it explicitly — the
// pages' guards read window.GharAuth (57 places). This was the real cause of
// the "no child selected" / "auth.js didn't load" failures: GharAuth itself
// was fine, but window.GharAuth was undefined, so every guard bailed out.
// (GharStreak got this line already; GharAuth was missed.)
window.GharAuth = GharAuth;

// Daily streak + daily challenge — mirrors the app (Streak + DailyChallenge
// + DailyQuiz). All localStorage, on-device, COPPA-safe, no backend.
// Streak = consecutive days with at least one mission done. Flame Diyo at
// 7 days, Streak Crown at 15. The daily challenge is one featured task a
// day (rotating formats), worth +15 XP, and finishing it keeps the streak
// alive. Quiz Blitz = 5 quiz questions solved correctly in one day.
const GharStreak = {
  // Local date as yyyy-MM-dd (the streak counts calendar days).
  todayString() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  },
  yesterdayString() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  },
  // Day-of-year (1-based), for the challenge rotation.
  dayOfYear() {
    const d = new Date();
    const start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  },
  count() { return parseInt(localStorage.getItem("ghar.streak.count") || "0", 10) || 0; },
  // Call when a mission is completed (done or verified). Grows the streak
  // if yesterday was the last active day, resets to 1 if the chain broke,
  // no-ops if already counted today.
  recordMissionDone() {
    const today = this.todayString();
    const lastDay = localStorage.getItem("ghar.streak.lastDay") || "";
    if (lastDay === today) return this.count();
    const newCount = (lastDay === this.yesterdayString()) ? this.count() + 1 : 1;
    localStorage.setItem("ghar.streak.count", String(newCount));
    localStorage.setItem("ghar.streak.lastDay", today);
    this.push().catch(() => {});
    return newCount;
  },
  dailyDoneToday() { return (localStorage.getItem("ghar.daily.done") || "") === this.todayString(); },
  // True if a mission was done today (per the streak's lastDay), even if
  // the daily.done flag was never set — e.g. the mission was finished
  // before the daily challenge existed. Used so the challenge shows
  // completed for work already done today.
  missionDoneToday() { return (localStorage.getItem("ghar.streak.lastDay") || "") === this.todayString(); },
  markDailyDone() { localStorage.setItem("ghar.daily.done", this.todayString()); this.push().catch(() => {}); },
  // 9 rotating challenges (3 per format), picked by day-of-year % 9.
  // Matches the app's DailyChallenge.today() exactly.
  CHALLENGES: [
    { format: "mission", icon: "🚩", title: "Mission of the Day", prompt: "Do the Tihar Greeting mission today — say it to someone you love.", refIDs: ["tihar-greeting"] },
    { format: "teachBack", icon: "🎤", title: "Teach-Back", prompt: "Teach someone the word 'momo' today. Say it, they repeat!", refIDs: ["momo"] },
    { format: "quizBlitz", icon: "⚡", title: "Quiz Blitz", prompt: "Answer 5 quiz questions as fast as you can. Beat your best!", refIDs: [] },
    { format: "mission", icon: "🚩", title: "Mission of the Day", prompt: "Count to 5 in Nepali for a family member today.", refIDs: ["count-to-five"] },
    { format: "teachBack", icon: "🎤", title: "Teach-Back", prompt: "Teach someone 3 Nepali greetings today: namaste, dhanyabad, pheri bhetaula!", refIDs: ["convo_namaste", "convo_dhanyabad", "convo_pharkera"] },
    { format: "quizBlitz", icon: "⚡", title: "Quiz Blitz", prompt: "5 questions, no wrong answers. Can you go perfect?", refIDs: [] },
    { format: "mission", icon: "🚩", title: "Mission of the Day", prompt: "Say the Tihar greeting to someone at dinner tonight.", refIDs: ["tihar-greeting"] },
    { format: "teachBack", icon: "🎤", title: "Teach-Back", prompt: "Teach someone to count to 3 in Nepali: ek, dui, tin!", refIDs: ["num_ek", "num_dui", "num_tin"] },
    { format: "quizBlitz", icon: "⚡", title: "Quiz Blitz", prompt: "Quiz time! 5 questions — how fast can you finish?", refIDs: [] },
  ],
  todayChallenge() { return this.CHALLENGES[this.dayOfYear() % 9]; },
  // Daily quiz solves (for Quiz Blitz). Resets each day.
  quizTodayCount() {
    if ((localStorage.getItem("ghar.daily.quizDate") || "") !== this.todayString()) return 0;
    return parseInt(localStorage.getItem("ghar.daily.quizCount") || "0", 10) || 0;
  },
  recordQuizSolve() {
    const today = this.todayString();
    if ((localStorage.getItem("ghar.daily.quizDate") || "") !== today) {
      localStorage.setItem("ghar.daily.quizDate", today);
      localStorage.setItem("ghar.daily.quizCount", "0");
    }
    const n = this.quizTodayCount() + 1;
    localStorage.setItem("ghar.daily.quizCount", String(n));
    this.push().catch(() => {});
    return n;
  },
  // True if this solve just finished today's Quiz Blitz. Marks it done
  // and records the streak day (the caller adds the +15 XP).
  checkBlitzComplete() {
    if (this.todayChallenge().format !== "quizBlitz") return false;
    if (this.dailyDoneToday()) return false;
    if (this.quizTodayCount() < 5) return false;
    this.markDailyDone();
    this.recordMissionDone();
    return true;
  },
  // Claim the daily challenge after a qualifying action. For a Mission
  // day, completing any mission qualifies. Returns true if the bonus was
  // just claimed (the caller adds +15 XP).
  claimIfMissionDay() {
    if (this.todayChallenge().format !== "mission") return false;
    if (this.dailyDoneToday()) return false;
    this.markDailyDone();
    return true;
  },
  // Claim the daily challenge directly (Teach-Back confirm button).
  claimDaily() {
    if (this.dailyDoneToday()) return false;
    this.markDailyDone();
    this.recordMissionDone();
    return true;
  },
  // Backfill: grant a streak day for missions completed before the streak
  // existed. Call with the number of missions already done (completed ∪
  // verified). Only fires once — when the streak was never recorded — so it
  // can never double-count. After this, the app's incremental rules run.
  syncFromMissions(completedCount) {
    if (!completedCount || completedCount <= 0) return;
    if (this.count() > 0) return;
    if (localStorage.getItem("ghar.streak.lastDay")) return;
    this.recordMissionDone();
  },
  // --- Cross-device sync (added 2026-11-09) ---
  // The streak + daily challenge used to live in localStorage only, so a
  // new device started at 0. Now they sync to the server like progress.
  // Merge rule (same as the server's): the row with the latest last_day
  // wins; on a tie the higher count wins. Daily fields follow the same
  // latest-date rule. Never wipes — a stale device can't rewind it.
  _streakState() {
    return {
      count: this.count(),
      last_day: localStorage.getItem("ghar.streak.lastDay") || "",
      daily_done: localStorage.getItem("ghar.daily.done") || "",
      daily_quiz_date: localStorage.getItem("ghar.daily.quizDate") || "",
      daily_quiz_count: this.quizTodayCount(),
    };
  },
  async push() {
    if (!window.GharAuth || !GharAuth.signedIn() || !GharAuth.childId()) return false;
    try {
      await GharAuth.api("/accounts/children/" + GharAuth.childId() + "/streak", "POST", this._streakState());
      return true;
    } catch (e) { return false; }
  },
  async pull() {
    if (!window.GharAuth || !GharAuth.signedIn() || !GharAuth.childId()) return false;
    let s;
    try {
      s = await GharAuth.api("/accounts/children/" + GharAuth.childId() + "/streak");
    } catch (e) { return false; }
    if (!s) return false;
    const local = this._streakState();
    // Streak count + last day: latest date wins, max count on a tie.
    let count = local.count, lastDay = local.last_day;
    if ((s.last_day || "") > local.last_day) { count = s.count || 0; lastDay = s.last_day; }
    else if ((s.last_day || "") === local.last_day && (s.count || 0) > local.count) { count = s.count; }
    // Daily done: latest date wins.
    let dailyDone = local.daily_done;
    if ((s.daily_done || "") > local.daily_done) { dailyDone = s.daily_done; }
    // Daily quiz: latest date wins, max count on a tie.
    let qDate = local.daily_quiz_date, qCount = local.daily_quiz_count;
    if ((s.daily_quiz_date || "") > local.daily_quiz_date) { qDate = s.daily_quiz_date; qCount = s.daily_quiz_count || 0; }
    else if ((s.daily_quiz_date || "") === local.daily_quiz_date && (s.daily_quiz_count || 0) > local.daily_quiz_count) { qCount = s.daily_quiz_count; }
    localStorage.setItem("ghar.streak.count", String(count));
    localStorage.setItem("ghar.streak.lastDay", lastDay);
    localStorage.setItem("ghar.daily.done", dailyDone);
    localStorage.setItem("ghar.daily.quizDate", qDate);
    localStorage.setItem("ghar.daily.quizCount", String(qCount));
    // Push the merged state back whenever it differs from the server's.
    // The old code only pushed when the server won, so a local-only streak
    // (built before the sync existed, server empty) never reached the
    // database — the dashboard and db-browser kept showing 0.
    const mergedState = {
      count, last_day: lastDay, daily_done: dailyDone,
      daily_quiz_date: qDate, daily_quiz_count: qCount,
    };
    const serverState = {
      count: Number(s.count) || 0, last_day: s.last_day || "",
      daily_done: s.daily_done || "", daily_quiz_date: s.daily_quiz_date || "",
      daily_quiz_count: Number(s.daily_quiz_count) || 0,
    };
    if (JSON.stringify(mergedState) !== JSON.stringify(serverState)) {
      try { await this.push(); } catch (e) {}
    }
    return true;
  },
};
// Top-level const does NOT attach to window, so expose it explicitly — the
// pages' guards read window.GharStreak.
window.GharStreak = GharStreak;
