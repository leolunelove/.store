// One catalogue is shared by the gallery and the server-side product allowlist.
export const PRODUCTS = [
  { id: "im-half-crazy", title: "I'm Half Crazy", file: "IM HALF CRAZY.png" },
  { id: "smile", title: "Smile", file: "smile.png" },
  { id: "who-made-you-king", title: "Who Made You King", file: "who made you king.png" },
  { id: "high-and-lows", title: "High and Lows", file: "High and lows.png" },
  { id: "why", title: "Why", file: "why.png" },
  { id: "xtcy", title: "XTCY", file: "xtcy.png" },
  { id: "famous", title: "Famous", file: "famous.png" },
  { id: "sensory", title: "Sensory", file: "sensory.png" },
  { id: "smoking-crack-is-bad", title: "Smoking Crack Is Bad", file: "smoking crack is bad.png" },
  { id: "i-want-to-beat-somebody-up", title: "I Want to Beat Somebody Up", file: "I want to beat somebody up.png" },
  { id: "fingertips", title: "Fingertips", file: "fingertips-1.png" },
  { id: "selfie", title: "Selfie", file: "selfie.png" }
].map((product, index) => ({ ...product, image: `downloads/${encodeURIComponent(product.file)}`, orientation: "portrait", number: String(index + 1).padStart(2,"0") }));
