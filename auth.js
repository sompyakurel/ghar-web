// Ghar accounts — shared client for the web.
// The parent signs in with an email magic link; each child has a profile
// and their progress (XP, heard words, quiz free questions) lives on the
// server. When nobody is signed in, the pages keep working from
// localStorage exactly as before (guest mode).
const GHAR_API = "https://backend-patient-wave-3724.fly.dev";
const SESSION_KEY = "ghar.session";
const CHILD_KEY = "ghar.childId";

const GharAuth = {
  session() { return localStorage.getItem(SESSION_KEY) || ""; },
  childId() { return localStorage.getItem(CHILD_KEY) || ""; },
  signedIn() { return !!this.session(); },
  signOut() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(CHILD_KEY);
    location.href = "signin.html";
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
  quizFreeUsed() { return parseInt(localStorage.getItem("ghar.quiz.freeUsed") || "0", 10) || 0; },
  heard(deckId) {
    try { return JSON.parse(localStorage.getItem("ghar.heard." + deckId) || "[]"); }
    catch (e) { return []; }
  },
  // Pull the active child's server progress into localStorage (so every
  // page shows the account's progress). Called on page load when signed in.
  async pull() {
    if (!this.signedIn() || !this.childId()) return false;
    const p = await this.api("/accounts/children/" + this.childId() + "/progress");
    localStorage.setItem("ghar.xp.total", String(p.xp));
    localStorage.setItem("ghar.quiz.freeUsed", String(p.quiz_free_used));
    Object.keys(p.heard).forEach(deckId => {
      localStorage.setItem("ghar.heard." + deckId, JSON.stringify(p.heard[deckId]));
    });
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
  // Guest carry-over: when the server has nothing for this child yet but
  // the browser has guest progress, push the browser's progress up so
  // nothing is lost on signup. Returns true if it carried anything over.
  async carryOver() {
    if (!this.signedIn() || !this.childId()) return false;
    const p = await this.api("/accounts/children/" + this.childId() + "/progress");
    const serverEmpty = p.xp === 0 && Object.keys(p.heard).length === 0;
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
