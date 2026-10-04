import about from "./about.json";
import pricing from "./pricing.json";
import compare from "./compare.json";
import chatgpt from "./paw-and-whisker-vs-chatgpt.json";
import petio from "./paw-and-whisker-vs-petio.json";
import perkypet from "./paw-and-whisker-vs-perkypet.json";
import shortlist from "./best-ai-pet-apps.json";

// Review credit is owned by the shared reviewer configuration, not static copy.
const aboutContent = { ...about, html: about.html
  .replace(/<h2>Reviewed by a licensed veterinarian: coming soon<\/h2><p>[\s\S]*?<\/p>/g,
    "<h2>Educational content review</h2><p>Reviewer credit appears only after an agreed review has actually been completed. It covers educational content, not individual AI answers or a veterinary consultation.</p>")
  .replace(/, and the page note <strong>Reviewed by a licensed veterinarian: coming soon<\/strong> should be read exactly that way: coming soon, not already complete\./g, ".") };
export default [aboutContent, pricing, compare, chatgpt, petio, perkypet, shortlist];