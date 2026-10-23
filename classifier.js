// Keyword-based classifier: sorts a request into a category
// by checking which category's keywords appear the most.
const CATEGORY_KEYWORDS = {
  "Streetlight / Electrical": ["ilaw", "poste", "streetlight", "kuryente", "wire", "kable", "brownout", "light"],
  "Garbage / Sanitation": ["basura", "garbage", "trash", "kalat", "baho", "mabaho", "kanal", "imburnal", "drainage"],
  "Road / Infrastructure": ["kalsada", "road", "lubak", "butas", "tulay", "bridge", "sidewalk", "baha", "flood"],
  "Water Supply": ["tubig", "water", "tagas", "leak", "gripo", "linya"],
  "Peace and Order": ["ingay", "noise", "away", "gulo", "nakaw", "magnanakaw", "theft", "videoke", "inuman"],
  "Documents / Certificates": ["clearance", "certificate", "cedula", "indigency", "residency", "permit", "document"],
  "Health": ["sakit", "health", "dengue", "lamok", "bakuna", "vaccine", "gamot", "medicine", "checkup"]
};

function classifyRequest(text) {
  // Split the text into lowercase words
  const words = text.toLowerCase().match(/[a-zñ]+/g) || [];

  let bestCategory = "Others";
  let bestScore = 0;

  for (const category in CATEGORY_KEYWORDS) {
    let score = 0;
    for (const keyword of CATEGORY_KEYWORDS[category]) {
      if (words.includes(keyword)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}