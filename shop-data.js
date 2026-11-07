// Ghar Shop -- the catalog. Shared by shop.html (buying) and myghar.html
// (showing what the kid owns in the room).
// A shop item: id, Nepali + English name, emoji, XP price, image file,
// default position in the room (fractions of the stage; the item's CENTER),
// width (% of the stage width), and the name clip to play when tapped
// (myghar_<id>_np.m4a when it exists, else null -- the item just pops).
// Trophies (goldenDiyo, starBadge, mukut) are EARNED, never sold -- they
// are not in this catalog. Suga the parrot IS a shop pet: he only appears
// in the room after the kid buys him.
const SHOP = [
  { id: "suga", ne: "सुगा", en: "Suga the parrot", emoji: "🦜", price: 100,
    img: "suga.png", x: 0.90, y: 0.86, w: 12, audio: "suga" },
  { id: "tulsi", ne: "तुलसी", en: "Tulsi plant", emoji: "🪴", price: 30,
    img: "tulsi.png", x: 0.83, y: 0.88, w: 8, audio: "tulsi" },
  { id: "mandir", ne: "मन्दिर", en: "Mini temple", emoji: "🛕", price: 50,
    img: "mandir.png", x: 0.32, y: 0.88, w: 10, audio: "mandir" },
  { id: "ghanta", ne: "घण्टा", en: "Temple bell", emoji: "🔔", price: 40,
    img: "ghanta.png", x: 0.15, y: 0.25, w: 6, audio: "ghanta" },
  { id: "rangoli", ne: "रङ्गोली", en: "Rangoli", emoji: "🎨", price: 25,
    img: "rangoli.png", x: 0.50, y: 0.96, w: 18, audio: "rangoli" },
  { id: "diyo", ne: "दियो", en: "Oil lamp", emoji: "🪔", price: 20,
    img: "diyo.png", x: 0.08, y: 0.93, w: 5, audio: null },
  { id: "jamara", ne: "जमरा", en: "Jamara shoots", emoji: "🌿", price: 15,
    img: "jamara.png", x: 0.89, y: 0.92, w: 6, audio: null },
  { id: "sayapatri", ne: "सयपत्री", en: "Marigold", emoji: "🌼", price: 15,
    img: "sayapatri.png", x: 0.71, y: 0.88, w: 6, audio: null },
  { id: "changa", ne: "चङ्गा", en: "Kite", emoji: "🪁", price: 35,
    img: "changa.png", x: 0.65, y: 0.18, w: 10, audio: null },
  { id: "guleyli", ne: "गुलेली", en: "Slingshot", emoji: "🏏", price: 30,
    img: "guleyli.png", x: 0.62, y: 0.88, w: 6, audio: "guleyli" },
  { id: "nanglo", ne: "नाङ्लो", en: "Winnowing tray", emoji: "🧺", price: 30,
    img: "nanglo.png", x: 0.24, y: 0.90, w: 8, audio: "nanglo" },
  { id: "khukuri", ne: "खुकुरी", en: "Khukuri", emoji: "⚔️", price: 45,
    img: "khukuri.png", x: 0.20, y: 0.30, w: 6, audio: "khukuri" },
  { id: "karuwa", ne: "करुवा", en: "Water vessel", emoji: "🏺", price: 35,
    img: "karuwa.png", x: 0.66, y: 0.92, w: 7, audio: "karuwa" },
  { id: "sarangi", ne: "सारंगी", en: "Sarangi", emoji: "🎸", price: 50,
    img: "sarangi.png", x: 0.78, y: 0.88, w: 7, audio: null },
  { id: "charkha", ne: "चर्खा", en: "Spinning wheel", emoji: "🪕", price: 45,
    img: "charkha.png", x: 0.15, y: 0.88, w: 9, audio: "charkha" },
  { id: "chautari", ne: "चौतारी", en: "Resting platform", emoji: "🌳", price: 60,
    img: "chautari.png", x: 0.05, y: 0.80, w: 14, audio: "chautari" },
];
const SHOP_KEY = "ghar.shop.owned";
function shopOwned() {
  try { return JSON.parse(localStorage.getItem(SHOP_KEY) || "[]"); }
  catch (e) { return []; }
}
function shopOwns(id) { return shopOwned().includes(id); }
function shopSaveOwned(list) { localStorage.setItem(SHOP_KEY, JSON.stringify(list)); }
