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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        group_code: code,
        nickname: nickname,
        xp: this.xp(),
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
    return newCount;
  },
  dailyDoneToday() { return (localStorage.getItem("ghar.daily.done") || "") === this.todayString(); },
  markDailyDone() { localStorage.setItem("ghar.daily.done", this.todayString()); },
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
};
// Top-level const does NOT attach to window, so expose it explicitly — the
// pages' guards read window.GharStreak.
window.GharStreak = GharStreak;
