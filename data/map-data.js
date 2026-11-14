// Ghar — Danfe Map place data (website).
//
// Source: the Nepal map research pack (~/workspace/research_notes/
// nepal-map-research-20261024-1441/report.md). The facts sheet was
// APPROVED by Som (Oct 25). Facts are copied EXACTLY as written in
// the pack — one short sentence each. Do not edit the facts here;
// fix them in the research pack and re-copy.
//
// Structure:
//   provinces — the 7 provinces, west to east. Madhesh is the southern
//     Terai strip, NOT a full north-to-south province.
//   pins — the 6 major pins. Kathmandu + Pokhara are FREE (free=true);
//     the other 4 are premium (free=false).
//   landmarks — hidden landmarks, 3 per province, found by tapping.
//     All 3 found in a province stamps it in the passport. All 7
//     stamped = Nepal Explorer badge + mystery treasure + XP.
//   xp.perFound — +5 XP per pin/landmark found (Som, 2026-11-09).
//   audio — all clips are Som's cloned voice (ElevenLabs), generated
//     2026-11-09, in assets/audio/map/. Names + facts in Nepali.
//     Landmark Devanagari comes from the audio manifest
//     (assets/audio/map/MANIFEST.tsv) — the same text Som's voice
//     speaks, so the written name and the spoken name match.
//
// Notes:
//   Koshi Tappu is listed in BOTH Koshi (koshitappu) and Madhesh
//   (saptari, its Saptari side) — the research pack says to list it
//   in both or pin it on the border, not wholly in one province.
//   Chitwan is a pin only, never duplicated as a landmark.
//   Capital Devanagari: standard spellings for well-known places
//   (Godawari, Birendranagar, Deukhuri, Pokhara, Hetauda, Janakpur,
//   Biratnagar) — Som to proof before release, per the pack's rule.
//
// Borders: draw from Open Knowledge Nepal LocalBoundaries (CC BY 4.0),
// never GADM (non-commercial licence only). Do not draw or label
// Kalapani–Limpiyadhura as a separate area.

window.GHAR_MAP_DATA = {
  provinces: [
    {
      id: "sudurpashchim",
      name: "Sudurpashchim",
      nepali: "सुदूरपश्चिम प्रदेश",
      capital: "Godawari",
      capitalNepali: "गोदावरी",
      terrain: "Mountains, hills and Terai plains",
      color: "#F9D5A7"
    },
    {
      id: "karnali",
      name: "Karnali",
      nepali: "कर्णाली प्रदेश",
      capital: "Birendranagar",
      capitalNepali: "वीरेन्द्रनगर",
      terrain: "Mountains and mid-hills",
      color: "#A8D8EA"
    },
    {
      id: "lumbini",
      name: "Lumbini",
      nepali: "लुम्बिनी प्रदेश",
      capital: "Deukhuri",
      capitalNepali: "देउखुरी",
      terrain: "Hills and Terai plains",
      color: "#B5EAD7"
    },
    {
      id: "gandaki",
      name: "Gandaki",
      nepali: "गण्डकी प्रदेश",
      capital: "Pokhara",
      capitalNepali: "पोखरा",
      terrain: "Hills, Himalaya and a little Terai",
      color: "#C7CEEA"
    },
    {
      id: "bagmati",
      name: "Bagmati",
      nepali: "बागमती प्रदेश",
      capital: "Hetauda",
      capitalNepali: "हेटौंडा",
      terrain: "Himalaya, hills and Terai",
      color: "#FFDAC1"
    },
    {
      id: "madhesh",
      name: "Madhesh",
      nepali: "मधेश प्रदेश",
      capital: "Janakpur",
      capitalNepali: "जनकपुर",
      terrain: "Flat Terai plains",
      color: "#FDE2A8"
    },
    {
      id: "koshi",
      name: "Koshi",
      nepali: "कोशी प्रदेश",
      capital: "Biratnagar",
      capitalNepali: "विराटनगर",
      terrain: "Himalaya, hills and Terai",
      color: "#E2F0CB"
    }
  ],

  pins: [
    {
      id: "kathmandu",
      visual: "🛕",
      name: "Kathmandu",
      nepali: "काठमाडौं",
      province: "bagmati",
      fact: "Nepal's capital city, in a valley in the hills, and the country's largest city.",
      free: true,
      audioName: "assets/audio/map/kathmandu_name_np.m4a",
      audioFact: "assets/audio/map/kathmandu_fact_np.m4a"
    },
    {
      id: "pokhara",
      visual: "🏞️",
      name: "Pokhara",
      nepali: "पोखरा",
      province: "gandaki",
      fact: "A lakeside city in the hills, and Gandaki's capital, with mountain views all around.",
      free: true,
      audioName: "assets/audio/map/pokhara_name_np.m4a",
      audioFact: "assets/audio/map/pokhara_fact_np.m4a"
    },
    {
      id: "chitwan",
      visual: "🦏",
      name: "Chitwan National Park",
      nepali: "चितवन",
      province: "bagmati",
      note: "Spans Bagmati, Gandaki and Madhesh; pin sits on the Bagmati–Gandaki border area.",
      fact: "Nepal's first national park (1973) and a UNESCO site, famous as a home of the one-horned rhinoceros and the Bengal tiger.",
      free: false,
      audioName: "assets/audio/map/chitwan_name_np.m4a",
      audioFact: "assets/audio/map/chitwan_fact_np.m4a"
    },
    {
      id: "rara",
      visual: "💧",
      name: "Rara Lake",
      nepali: "रारा ताल",
      province: "karnali",
      fact: "Nepal's largest lake, a deep blue lake high in the mountains (about 2,990 m) inside Rara National Park.",
      free: false,
      audioName: "assets/audio/map/rara_name_np.m4a",
      audioFact: "assets/audio/map/rara_fact_np.m4a"
    },
    {
      id: "janaki",
      visual: "🛕",
      name: "Janaki Mandir",
      nepali: "जानकी मन्दिर",
      province: "madhesh",
      fact: "A big, bright white temple in Janakpur honouring Sita, also called Janaki, from the Ramayana story.",
      free: false,
      audioName: "assets/audio/map/janaki_name_np.m4a",
      audioFact: "assets/audio/map/janaki_fact_np.m4a"
    },
    {
      id: "sagarmatha",
      visual: "🏔️",
      name: "Sagarmatha / Mount Everest",
      nepali: "सगरमाथा",
      province: "koshi",
      fact: "The highest mountain on Earth, 8,848 m, stands on Nepal's border with China; in Nepali it is called Sagarmatha.",
      free: false,
      audioName: "assets/audio/map/sagarmatha_name_np.m4a",
      audioFact: "assets/audio/map/sagarmatha_fact_np.m4a"
    }
  ],

  // Hidden landmarks — 3 per province, found by tapping.
  landmarks: [
    // Koshi (3)
    {
      id: "kanchenjunga",
      visual: "🏔️",
      name: "Kanchenjunga",
      nepali: "कञ्चनजङ्घा",
      province: "koshi",
      fact: "The world's third-highest mountain (8,586 m) sits on Koshi's north-eastern border with India.",
      audioName: "assets/audio/map/kanchenjunga_name_np.m4a",
      audioFact: "assets/audio/map/kanchenjunga_fact_np.m4a"
    },
    {
      id: "ilam",
      visual: "🍃",
      name: "Ilam Tea Gardens",
      nepali: "इलाम चिया बगान",
      province: "koshi",
      fact: "Rolling green hills in Ilam grow famous Nepali tea, and the area is sometimes called the 'Queen of Hills.'",
      audioName: "assets/audio/map/ilam_name_np.m4a",
      audioFact: "assets/audio/map/ilam_fact_np.m4a"
    },
    {
      id: "koshitappu",
      visual: "🦆",
      name: "Koshi Tappu Wildlife Reserve",
      nepali: "कोशी टप्पु वन्यजन्तु आरक्ष",
      province: "koshi",
      note: "Shared with Madhesh — its eastern part lies in Madhesh's Saptari district.",
      fact: "A wetland on the Koshi River where hundreds of bird species stop, and wild water buffalo called arna live.",
      audioName: "assets/audio/map/koshitappu_name_np.m4a",
      audioFact: "assets/audio/map/koshitappu_fact_np.m4a"
    },
    // Madhesh (3)
    {
      id: "janakpurponds",
      visual: "🪷",
      name: "Janakpur's Ponds and Vivah Mandap",
      nepali: "जनकपुरका पोखरी र विवाह मण्डप",
      province: "madhesh",
      fact: "Next to the temple are holy ponds, and a wedding pavilion where the marriage of Rama and Sita is celebrated each year at Vivah Panchami.",
      audioName: "assets/audio/map/janakpurponds_name_np.m4a",
      audioFact: "assets/audio/map/janakpurponds_fact_np.m4a"
    },
    {
      id: "parsa",
      visual: "🌳",
      name: "Parsa National Park",
      nepali: "पर्सा राष्ट्रिय निकुञ्ज",
      province: "madhesh",
      fact: "A green forest park in the west of Madhesh, next to Chitwan, where wild animals live in the Terai jungle.",
      audioName: "assets/audio/map/parsa_name_np.m4a",
      audioFact: "assets/audio/map/parsa_fact_np.m4a"
    },
    {
      id: "saptari",
      visual: "🦆",
      name: "Koshi Tappu (Saptari side)",
      nepali: "सप्तरी कोशी टप्पु",
      province: "madhesh",
      note: "The Saptari side of Koshi Tappu — the same reserve, listed in both Koshi and Madhesh per the research pack.",
      fact: "A wetland on the Koshi River where hundreds of bird species stop, and wild water buffalo called arna live.",
      audioName: "assets/audio/map/saptari_name_np.m4a",
      audioFact: "assets/audio/map/saptari_fact_np.m4a"
    },
    // Bagmati (3)
    {
      id: "swayambhu",
      visual: "🐒",
      name: "Swayambhunath (Monkey Temple)",
      nepali: "स्वयम्भूनाथ",
      province: "bagmati",
      fact: "A hilltop stupa above Kathmandu with big painted Buddha eyes, where monkeys play and prayer flags flutter.",
      audioName: "assets/audio/map/swayambhu_name_np.m4a",
      audioFact: "assets/audio/map/swayambhu_fact_np.m4a"
    },
    {
      id: "pashupatinath",
      visual: "🛕",
      name: "Pashupatinath Temple",
      nepali: "पशुपतिनाथ मन्दिर",
      province: "bagmati",
      fact: "A very holy Hindu temple to Shiva on the Bagmati River in Kathmandu.",
      audioName: "assets/audio/map/pashupatinath_name_np.m4a",
      audioFact: "assets/audio/map/pashupatinath_fact_np.m4a"
    },
    {
      id: "bhaktapur",
      visual: "🏛️",
      name: "Bhaktapur Durbar Square",
      nepali: "भक्तपुर दरबार क्षेत्र",
      province: "bagmati",
      fact: "Another old royal square nearby, famous for its tall Nyatapola Temple and pottery makers.",
      audioName: "assets/audio/map/bhaktapur_name_np.m4a",
      audioFact: "assets/audio/map/bhaktapur_fact_np.m4a"
    },
    // Gandaki (3)
    {
      id: "phewa",
      visual: "🚣",
      name: "Phewa Lake",
      nepali: "फेवा ताल",
      province: "gandaki",
      fact: "Pokhara's big lake, where you can ride a boat to a small island temple, and snowy mountains reflect in the water.",
      audioName: "assets/audio/map/phewa_name_np.m4a",
      audioFact: "assets/audio/map/phewa_fact_np.m4a"
    },
    {
      id: "annapurna",
      visual: "🏔️",
      name: "Annapurna",
      nepali: "अन्नपूर्ण",
      province: "gandaki",
      fact: "A giant snowy mountain range; its highest peak reaches 8,091 m, one of the world's great 8,000-metre peaks.",
      audioName: "assets/audio/map/annapurna_name_np.m4a",
      audioFact: "assets/audio/map/annapurna_fact_np.m4a"
    },
    {
      id: "muktinath",
      visual: "🛕",
      name: "Muktinath Temple",
      nepali: "मुक्तिनाथ मन्दिर",
      province: "gandaki",
      fact: "A high mountain temple (about 3,762–3,800 m) that is holy to both Hindus and Buddhists.",
      audioName: "assets/audio/map/muktinath_name_np.m4a",
      audioFact: "assets/audio/map/muktinath_fact_np.m4a"
    },
    // Lumbini (3)
    {
      id: "lumbini",
      visual: "🌸",
      name: "Lumbini Garden (Sacred Garden)",
      nepali: "लुम्बिनी बगैंचा",
      province: "lumbini",
      fact: "The peaceful garden where, Buddhists believe, Prince Siddhartha Gautama, who became the Buddha, was born.",
      audioName: "assets/audio/map/lumbini_name_np.m4a",
      audioFact: "assets/audio/map/lumbini_fact_np.m4a"
    },
    {
      id: "mayadevi",
      visual: "🪷",
      name: "Maya Devi Temple and Ashoka Pillar",
      nepali: "मायादेवी मन्दिर",
      province: "lumbini",
      fact: "Inside the garden, a temple marks the Buddha's birthplace, and an old stone pillar was put up by Emperor Ashoka in 249 BC.",
      audioName: "assets/audio/map/mayadevi_name_np.m4a",
      audioFact: "assets/audio/map/mayadevi_fact_np.m4a"
    },
    {
      id: "bardiya",
      visual: "🐅",
      name: "Bardiya National Park",
      nepali: "बर्दिया राष्ट्रिय निकुञ्ज",
      province: "lumbini",
      fact: "A wild jungle park in the Terai where rhinos, tigers, elephants and dolphins in the Karnali River can be found.",
      audioName: "assets/audio/map/bardiya_name_np.m4a",
      audioFact: "assets/audio/map/bardiya_fact_np.m4a"
    },
    // Karnali (3)
    {
      id: "phoksundo",
      visual: "💧",
      name: "Shey Phoksundo Lake",
      nepali: "शे-फोक्सुण्डो ताल",
      province: "karnali",
      fact: "A bright turquoise lake in Dolpa, Nepal's deepest lake, inside Shey Phoksundo National Park, Nepal's largest national park.",
      audioName: "assets/audio/map/phoksundo_name_np.m4a",
      audioFact: "assets/audio/map/phoksundo_fact_np.m4a"
    },
    {
      id: "karnaliriver",
      visual: "🌊",
      name: "Karnali River",
      nepali: "कर्णाली नदी",
      province: "karnali",
      fact: "Nepal's longest river, flowing south through deep gorges from the high mountains.",
      audioName: "assets/audio/map/karnaliriver_name_np.m4a",
      audioFact: "assets/audio/map/karnaliriver_fact_np.m4a"
    },
    {
      id: "sinja",
      visual: "🏛️",
      name: "Sinja Valley, Jumla",
      nepali: "सिन्जा उपत्यका",
      province: "karnali",
      fact: "An old valley with ancient temples, once the centre of the old Khasa kingdom.",
      audioName: "assets/audio/map/sinja_name_np.m4a",
      audioFact: "assets/audio/map/sinja_fact_np.m4a"
    },
    // Sudurpashchim (3)
    {
      id: "khaptad",
      visual: "🦚",
      name: "Khaptad National Park",
      nepali: "खप्तड राष्ट्रिय निकुञ्ज",
      province: "sudurpashchim",
      fact: "Rolling green hill meadows on a high plateau (about 3,000 m) where the Danfe bird itself lives.",
      audioName: "assets/audio/map/khaptad_name_np.m4a",
      audioFact: "assets/audio/map/khaptad_fact_np.m4a"
    },
    {
      id: "shuklaphanta",
      visual: "🦌",
      name: "Shuklaphanta National Park",
      nepali: "शुक्लाफाँटा राष्ट्रिय निकुञ्ज",
      province: "sudurpashchim",
      fact: "Wide open grasslands in Kanchanpur, famous for herds of swamp deer.",
      audioName: "assets/audio/map/shuklaphanta_name_np.m4a",
      audioFact: "assets/audio/map/shuklaphanta_fact_np.m4a"
    },
    {
      id: "ghodaghodi",
      visual: "🦢",
      name: "Ghodaghodi Lake",
      nepali: "घोडाघोडी ताल",
      province: "sudurpashchim",
      fact: "A chain of shallow lakes in Kailali, a Ramsar wetland where many birds and animals live.",
      audioName: "assets/audio/map/ghodaghodi_name_np.m4a",
      audioFact: "assets/audio/map/ghodaghodi_fact_np.m4a"
    }
  ],

  xp: {
    perFound: 5
  }
};
