// Ghar Shop + Mystery Box -- the catalogs. Shared by shop.html (buying),
// myghar.html (showing what the kid owns / earned in the room).
//
// TWO ways things get into the room, and they never mix:
//   SHOP -- bought with XP. Trophies are NOT sold here (they are earned
//     by learning), and neither are the Mystery Box treasures.
//   MYSTERY -- earned from a Mystery Box. One box is earned for every 3
//     decks completed. Opening a box reveals a random treasure the kid
//     does not already own. The six treasures are the app's Mystery Box
//     treasures: karuwa, charkha, nanglo, khukuri, sarangi, guleyli.
// A room item: id, Nepali + English name, emoji, image file, default
// position in the room (fractions of the stage; the item's CENTER),
// width (% of the stage width), and the name clip to play when tapped
// (myghar_<id>_np.m4a when it exists, else null -- the item just pops).
// Shop items also carry a price (XP). Mystery items do not.
const SHOP = [
  { id: "suga", ne: "सुगा", en: "Suga the parrot", emoji: "🦜", price: 150,
    img: "suga.png", x: 0.90, y: 0.60, w: 12, audio: "suga",
    stand: { img: "suga_stand.png", x: 0.90, y: 0.84, w: 15 } },
  { id: "tulsi", ne: "तुलसी", en: "Tulsi plant", emoji: "🪴", price: 45,
    img: "tulsi.png", x: 0.83, y: 0.88, w: 8, audio: "tulsi" },
  { id: "mandir", ne: "मन्दिर", en: "Mini temple", emoji: "🛕", price: 75,
    img: "mandir.png", x: 0.32, y: 0.88, w: 10, audio: "mandir" },
  { id: "ghanta", ne: "घण्टा", en: "Temple bell", emoji: "🔔", price: 60,
    img: "ghanta.png", x: 0.15, y: 0.25, w: 6, audio: "ghanta" },
  { id: "rangoli", ne: "रङ्गोली", en: "Rangoli", emoji: "🎨", price: 38,
    img: "rangoli.png", x: 0.50, y: 0.93, w: 10, audio: "rangoli" },
  { id: "diyo", ne: "दियो", en: "Oil lamp", emoji: "🪔", price: 30,
    img: "diyo.png", x: 0.08, y: 0.93, w: 5, audio: "diyo" },
  { id: "jamara", ne: "जमरा", en: "Jamara shoots", emoji: "🌿", price: 23,
    img: "jamara.png", x: 0.89, y: 0.92, w: 6, audio: "jamara" },
  { id: "sayapatri", ne: "सयपत्री", en: "Marigold", emoji: "🌼", price: 23,
    img: "sayapatri.png", x: 0.71, y: 0.88, w: 6, audio: "sayapatri" },
  { id: "changa", ne: "चङ्गा", en: "Kite", emoji: "🪁", price: 53,
    img: "changa.png", x: 0.65, y: 0.18, w: 10, audio: "changa" },
  { id: "chautari", ne: "चौतारी", en: "Resting platform", emoji: "🌳", price: 90,
    img: "chautari.png", x: 0.05, y: 0.80, w: 14, audio: "chautari" },
  { id: "garden", ne: "बगैंचा", en: "Garden", emoji: "🌻", price: 83,
    img: "garden.png", x: 0.12, y: 0.92, w: 10, audio: "garden" },
  { id: "mala", ne: "माला", en: "Garland", emoji: "📿", price: 30,
    img: "mala.png", x: 0.85, y: 0.30, w: 8, audio: "mala" },
  // Added for the app's DecoSets (feature #4). No picture file ships for
  // these yet, so they render as their emoji (emojiOnly) in the shop and
  // in the room — never as a broken image. Prices are the app's prices.
  { id: "door", ne: "ढोका", en: "Door", emoji: "🚪", price: 30,
    img: null, emojiOnly: true, x: 0.62, y: 0.88, w: 9, audio: "door" },
  { id: "windows", ne: "झ्याल", en: "Windows", emoji: "🪟", price: 15,
    img: null, emojiOnly: true, x: 0.78, y: 0.42, w: 9, audio: "windows" },
  { id: "flags", ne: "झण्डा", en: "Prayer flags", emoji: "🚩", price: 53,
    img: null, emojiOnly: true, x: 0.30, y: 0.15, w: 10, audio: "flags" },
  { id: "himal", ne: "हिमाल", en: "Himalaya mountains", emoji: "🏔️", price: 158,
    img: null, emojiOnly: true, x: 0.50, y: 0.22, w: 12, audio: "himal" },
  // Emoji-only decorations added 2026-11-12 (Som): more for learners to
  // spend XP on. No picture files and no name clips (audio: null - the
  // item just pops when tapped, same as the other emoji-only pieces).
  { id: "sofa", ne: "\u0938\u094b\u092b\u093e", en: "Sofa", emoji: "🛋️", price: 90,
    img: null, emojiOnly: true, x: 0.50, y: 0.88, w: 16, audio: null },
  { id: "bed", ne: "\u0913\u091b\u094d\u092f\u093e\u0928", en: "Bed", emoji: "🛏️", price: 120,
    img: null, emojiOnly: true, x: 0.18, y: 0.86, w: 15, audio: null },
  { id: "kursi", ne: "\u0915\u0941\u0930\u094d\u0938\u0940", en: "Chair", emoji: "🪑", price: 45,
    img: null, emojiOnly: true, x: 0.68, y: 0.88, w: 7, audio: null },
  { id: "kitab", ne: "\u0915\u093f\u0924\u093e\u092c", en: "Books", emoji: "📚", price: 55,
    img: null, emojiOnly: true, x: 0.30, y: 0.90, w: 8, audio: null },
  { id: "ghadi", ne: "\u0918\u0921\u0940", en: "Clock", emoji: "🕰️", price: 40,
    img: null, emojiOnly: true, x: 0.50, y: 0.25, w: 6, audio: null },
  { id: "tasbir", ne: "\u0924\u0938\u094d\u092c\u093f\u0930", en: "Picture", emoji: "🖼️", price: 30,
    img: null, emojiOnly: true, x: 0.22, y: 0.30, w: 8, audio: null },
  { id: "madal", ne: "\u092e\u093e\u0926\u0932", en: "Madal drum", emoji: "🥁", price: 70,
    img: null, emojiOnly: true, x: 0.80, y: 0.90, w: 8, audio: null },
  { id: "chiya", ne: "\u091a\u093f\u092f\u093e", en: "Tea", emoji: "🍵", price: 25,
    img: null, emojiOnly: true, x: 0.58, y: 0.92, w: 6, audio: null },
  { id: "khelauna", ne: "\u0916\u0947\u0932\u094c\u0928\u093e", en: "Teddy toy", emoji: "🧸", price: 35,
    img: null, emojiOnly: true, x: 0.40, y: 0.90, w: 7, audio: null },
  { id: "football", ne: "\u092b\u0941\u091f\u092c\u0932", en: "Football", emoji: "\u26BD", price: 20,
    img: null, emojiOnly: true, x: 0.60, y: 0.94, w: 6, audio: null },
  { id: "phool", ne: "\u092b\u0942\u0932", en: "Flowers", emoji: "💐", price: 30,
    img: null, emojiOnly: true, x: 0.76, y: 0.30, w: 7, audio: null },
  { id: "mainbatti", ne: "\u092e\u0948\u0928\u092c\u0924\u094d\u0924\u0940", en: "Candle", emoji: "🕯️", price: 15,
    img: null, emojiOnly: true, x: 0.12, y: 0.55, w: 5, audio: null },
  { id: "radio", ne: "\u0930\u0947\u0921\u093f\u092f\u094b", en: "Radio", emoji: "📻", price: 50,
    img: null, emojiOnly: true, x: 0.86, y: 0.45, w: 8, audio: null },
  { id: "hatti", ne: "\u0939\u093e\u0924\u094d\u0924\u0940", en: "Elephant statue", emoji: "🐘", price: 80,
    img: null, emojiOnly: true, x: 0.08, y: 0.86, w: 11, audio: null },
  { id: "mayur", ne: "\u092e\u092f\u0942\u0930", en: "Peacock", emoji: "🦚", price: 65,
    img: null, emojiOnly: true, x: 0.94, y: 0.86, w: 9, audio: null },
  { id: "laltin", ne: "\u0932\u093e\u0932\u091f\u093f\u0928", en: "Lantern", emoji: "🏮", price: 45,
    img: null, emojiOnly: true, x: 0.35, y: 0.20, w: 6, audio: null },
];
// ---- DecoSets (feature #4, the app's sets) ----
// Website change 2026-11-12 (Som): completing a set earns its badge and
// celebration only - no bonus XP. Spending XP should not earn XP.
// "buddy" in the app's Home Set is Suga on the site (same item, site id
// "suga"). Chautari and Garden are buyable but in no app set — set-less.
const DECO_SETS = [
  { id: "tihar", name: "Tihar Set", emoji: "🪔", items: ["diyo", "sayapatri", "rangoli", "mala"], bonus: 0 },
  { id: "garden", name: "Garden Set", emoji: "🌿", items: ["tulsi", "jamara"], bonus: 0 },
  { id: "home", name: "Home Set", emoji: "🏠", items: ["door", "windows", "flags", "suga"], bonus: 0 },
  { id: "sky-temple", name: "Sky & Temple Set", emoji: "🏔️", items: ["changa", "himal", "ghanta", "mandir"], bonus: 0 },
];
const DECO_SET_TOTAL_BONUS = 0;
// Awarded set bonuses, persisted locally AND pushed through the existing
// /myghar sync (set_bonuses_json) so a second device never re-awards.
// Append-only: a set is awarded once, ever — union-merge is safe.
const SET_BONUS_KEY = "ghar.shop.setBonuses";
function decoSetsAwarded() {
  try { return JSON.parse(localStorage.getItem(SET_BONUS_KEY) || "[]"); }
  catch (e) { return []; }
}
function decoSetIsAwarded(setId) { return decoSetsAwarded().includes(setId); }
function decoSetSaveAwarded(list) { localStorage.setItem(SET_BONUS_KEY, JSON.stringify([...new Set(list)])); }
function decoSetMarkAwarded(setId) {
  const list = decoSetsAwarded();
  if (!list.includes(setId)) { list.push(setId); decoSetSaveAwarded(list); }
  return list;
}
// Merge server-awarded sets in (union — never removes an award).
function decoSetMergeAwarded(serverValue) {
  let incoming = [];
  if (Array.isArray(serverValue)) incoming = serverValue;
  else if (typeof serverValue === "string") { try { incoming = JSON.parse(serverValue) || []; } catch (e) { incoming = []; } }
  if (!incoming.length) return decoSetsAwarded();
  decoSetSaveAwarded([...decoSetsAwarded(), ...incoming]);
  return decoSetsAwarded();
}
function decoSetPayload() { return { set_bonuses_json: JSON.stringify(decoSetsAwarded()) }; }
// Sets newly completed by the current owned list (owned every item, not
// yet awarded). Call on each purchase; award once per set, never twice.
function decoSetsNewlyCompleted(owned) {
  const awarded = decoSetsAwarded();
  return DECO_SETS.filter(s => !awarded.includes(s.id) && s.items.every(id => owned.includes(id)));
}
function decoSetProgress(set, owned) {
  const have = set.items.filter(id => owned.includes(id));
  return { have, missing: set.items.filter(id => !owned.includes(id)), done: have.length === set.items.length };
}
// ---- Put-away / storage (feature #11) ----
// Stored = bought/earned but put away off the room. Stored items stay
// owned (never re-charged, never duplicated) and put back for free.
// Sync: { ids, updated } through the existing /myghar sync as
// stored_json. Latest-writer-wins on `updated`, so a put-back on one
// device is not resurrected by a stale device's older stored list.
const SHOP_STORED_KEY = "ghar.shop.stored";
const SHOP_STORED_UPDATED_KEY = "ghar.shop.storedUpdated";
function shopStoredState() {
  let ids = [];
  try { ids = JSON.parse(localStorage.getItem(SHOP_STORED_KEY) || "[]"); } catch (e) { ids = []; }
  return { ids: [...new Set(ids)], updated: parseInt(localStorage.getItem(SHOP_STORED_UPDATED_KEY) || "0", 10) || 0 };
}
function shopStored() { return shopStoredState().ids; }
function shopIsStored(id) { return shopStored().includes(id); }
function shopSaveStored(list) {
  localStorage.setItem(SHOP_STORED_KEY, JSON.stringify([...new Set(list)]));
  localStorage.setItem(SHOP_STORED_UPDATED_KEY, String(Date.now()));
}
function shopStore(id) {
  const s = shopStoredState();
  if (!s.ids.includes(id)) { s.ids.push(id); shopSaveStored(s.ids); }
  return shopStored();
}
function shopRestore(id) {
  shopSaveStored(shopStored().filter(x => x !== id));
  return shopStored();
}
function shopStoredPayload() {
  const s = shopStoredState();
  return { stored_json: JSON.stringify({ ids: s.ids, updated: s.updated }) };
}
// Merge a server stored_json in: the newer side wins wholesale.
function shopStoredMerge(serverValue) {
  let incoming = null;
  if (typeof serverValue === "string") { try { incoming = JSON.parse(serverValue); } catch (e) { incoming = null; } }
  else if (serverValue && typeof serverValue === "object") incoming = serverValue;
  if (!incoming || !Array.isArray(incoming.ids)) return shopStoredState();
  const local = shopStoredState();
  const incomingUpdated = parseInt(incoming.updated || "0", 10) || 0;
  if (incomingUpdated > local.updated) {
    localStorage.setItem(SHOP_STORED_KEY, JSON.stringify([...new Set(incoming.ids)]));
    localStorage.setItem(SHOP_STORED_UPDATED_KEY, String(incomingUpdated));
  }
  return shopStoredState();
}
const MYSTERY = [
  { id: "guleyli", ne: "गुलेली", en: "Slingshot", emoji: "🏏",
    img: "guleyli.png", x: 0.62, y: 0.88, w: 6, audio: "guleyli" },
  { id: "nanglo", ne: "नाङ्लो", en: "Winnowing tray", emoji: "🧺",
    img: "nanglo.png", x: 0.24, y: 0.90, w: 8, audio: "nanglo" },
  { id: "charkha", ne: "चर्खा", en: "Spinning wheel", emoji: "🪕",
    img: "charkha.png", x: 0.15, y: 0.88, w: 9, audio: "charkha" },
  { id: "khukuri", ne: "खुकुरी", en: "Khukuri", emoji: "⚔️",
    img: "khukuri.png", x: 0.20, y: 0.30, w: 6, audio: "khukuri" },
  { id: "sarangi", ne: "सारंगी", en: "Sarangi", emoji: "🎸",
    img: "sarangi.png", x: 0.78, y: 0.88, w: 7, audio: "sarangi" },
  { id: "karuwa", ne: "करुवा", en: "Water vessel", emoji: "🏺",
    img: "karuwa.png", x: 0.66, y: 0.92, w: 7, audio: "karuwa" },
];
// One Mystery Box is earned for every 3 decks completed.
const MYSTERY_DECKS_PER_BOX = 3;
const SHOP_KEY = "ghar.shop.owned";
const MYSTERY_KEY = "ghar.mystery.owned";
// Suga's name — "Suga" until the child renames him (myghar.html). Read on
// display, so the shop and the room always show the same name.
const SUGA_NAME_KEY = "ghar.suga.name";
function sugaName() {
  const n = (localStorage.getItem(SUGA_NAME_KEY) || "").trim();
  return n === "" ? "Suga" : n;
}
// Parrot rename rules — copied EXACTLY from the app (ContentView.swift:
// buddyNameError + BuddyBannedWords). A rename costs 25 XP and the name
// must be short, letters only (Latin + Devanagari, plus space/hyphen/
// apostrophe), with nothing rude. Empty is fine — it just resets to the
// default "Suga". Matched case-insensitively, whole words only — so
// "hello" stays legal.
const BUDDY_BANNED_WORDS = [
  "fuck", "fucking", "shit", "bitch", "ass", "asshole", "dick", "cock",
  "pussy", "whore", "slut", "bastard", "damn", "dammit", "goddamn",
  "crap", "piss", "douche", "retard", "fag", "nigga",
];
const SUGA_RENAME_COST = 25;
// Count grapheme clusters (what Swift's String.count does) — a Devanagari
// syllable like "मि" is ONE cluster, not two code points. Intl.Segmenter
// is supported in all modern browsers; fall back to code points.
function _graphemeLength(s) {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    return [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(s)].length;
  }
  return [...s].length;
}
function sugaNameError(raw) {
  const name = (raw || "").trim();
  if (!name) return null; // empty is OK — resets to "Suga"
  if (_graphemeLength(name) > 14) return "Keep it short — 14 letters max";
  // \p{L} = letters, \p{M} = combining marks. Devanagari vowel signs /
  // matras (ि ो) are MARKS, not letters — without \p{M} a name like
  // "मिठो" would be wrongly rejected. This matches Swift's
  // Character.isLetter, which treats a base letter + its matras as one
  // letter cluster.
  if (/[^\p{L}\p{M} \-']/u.test(name)) return "Letters only, please!";
  const words = name.toLowerCase().split(/[^\p{L}\p{M}]+/u).filter(Boolean);
  if (words.some(w => BUDDY_BANNED_WORDS.includes(w))) return "Let's pick a nicer name 🦜";
  return null;
}
// First 3 decorations free (matches the app's free tier: 3 decorations).
// The count is the number of FREE purchases made (0–3), not the owned
// count — a paid purchase must not consume the allowance.
const SHOP_FREE_COUNT = 3;
const SHOP_FREE_USED_KEY = "ghar.shop.freeUsed";
function shopFreeUsed() {
  // Migration: decorations already owned consume the allowance, so a
  // child who already owns 3+ gets no extra freebies on deploy.
  const raw = localStorage.getItem(SHOP_FREE_USED_KEY);
  if (raw === null) {
    const used = Math.min(SHOP_FREE_COUNT, shopOwned().length);
    localStorage.setItem(SHOP_FREE_USED_KEY, String(used));
    return used;
  }
  return Math.min(SHOP_FREE_COUNT, parseInt(raw, 10) || 0);
}
function shopFreeLeft() { return Math.max(0, SHOP_FREE_COUNT - shopFreeUsed()); }
function shopUseFree() {
  localStorage.setItem(SHOP_FREE_USED_KEY, String(Math.min(SHOP_FREE_COUNT, shopFreeUsed() + 1)));
}
function shopOwned() {
  try { return JSON.parse(localStorage.getItem(SHOP_KEY) || "[]"); }
  catch (e) { return []; }
}
function shopOwns(id) { return shopOwned().includes(id); }
function shopSaveOwned(list) { localStorage.setItem(SHOP_KEY, JSON.stringify(list)); }
function mysteryOwned() {
  try { return JSON.parse(localStorage.getItem(MYSTERY_KEY) || "[]"); }
  catch (e) { return []; }
}
function mysterySaveOwned(list) { localStorage.setItem(MYSTERY_KEY, JSON.stringify(list)); }
