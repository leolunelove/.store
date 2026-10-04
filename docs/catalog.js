// Search vocabulary is curated, not inferred from visitors or external services.
const TAGS = {
  'im-half-crazy': 'orange black typography type collage grunge',
  smile: 'yellow white typography type happy cartoon',
  'who-made-you-king': 'black cream sword rock photo king',
  'high-and-lows': 'red cream typography type texture',
  why: 'orange yellow black typography type silhouette',
  xtcy: 'pink red teal green photo portrait',
  famous: 'green yellow black typography type blur',
  sensory: 'blue yellow hands photo texture',
  'smoking-crack-is-bad': 'yellow orange typography type lettering',
  'i-want-to-beat-somebody-up': 'red orange typography type lettering collage',
  fingertips: 'blue pink cream hands photo halftone',
  selfie: 'portrait photo red green cream collage'
};
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
].map((product, index) => ({
  ...product,
  tags: TAGS[product.id].split(' '),
  image: `downloads/${encodeURIComponent(product.file)}`,
  preview: `preview-${product.id}.jpg`,
  previewSmall: `preview-${product.id}-small.jpg`,
  previewMedium: `preview-${product.id}-medium.jpg`,
  page: `${product.id}.html`,
  width: 1080,
  height: 1440,
  // Add a real print master here when supplied; never upscale the screen file.
  printFile: null,
  category: ['who-made-you-king', 'xtcy', 'sensory', 'fingertips', 'selfie'].includes(product.id) ? 'photo' : 'type',
  number: String(index + 1).padStart(2, '0')
}));

// Change this list to rotate the opening row without renaming files or links.
export const FEATURED_IDS = ['fingertips', 'im-half-crazy', 'who-made-you-king'];
export const FEATURED_PRODUCTS = [...PRODUCTS].sort((a, b) => {
  const rank = id => FEATURED_IDS.includes(id) ? FEATURED_IDS.indexOf(id) : FEATURED_IDS.length;
  return rank(a.id) - rank(b.id);
});
