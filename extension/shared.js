/* Shared prompt logic, usable in both the browser and Node tests. */
(function (root) {
  const roles = ['Stop-Scrolling Cover', 'Inside Preview', "What's Included / Value"];
  const rules = 'REFERENCE = STYLE ONLY. MY RESOURCE IMAGES = PRODUCT. MY TEXT = EXACT WORDING. Never copy wording, logos, branding, or product content from the reference. Never invent resource content or claims.';
  const initial = () => ({ name: 'My teaching resource', reference: null, resources: [], analysis: '', locked: false, thumbnails: roles.map(() => ({ title: '', subtitle: '', badge: '', details: '', pages: [] })), refinement: '' });
  function analysisPrompt(p) {
    return `Analyze the attached reference thumbnail deeply before generating anything. Do not create an image yet.\n${rules}\nReference attachment: ${p.reference.name}.\nDocument a reusable STYLE DNA specification with these headings:\n1. Canvas and aspect ratio; grid, safe margins, and relative positions in percentages.\n2. Palette: approximate HEX colors, contrast, dominant and accent color roles.\n3. Typography: font character, weight, case, hierarchy, approximate size ratios, line spacing, outlines, shadows. Do not claim to know an exact font if uncertain.\n4. Layout: headline, subtitle, badges, product previews; alignment, spacing, layering, rotation, and framing.\n5. Background: texture, gradients, borders, and depth.\n6. Decorative accents: shape, density, scale, placement; avoid copying proprietary characters or logos.\n7. Product image treatment: crops, frames, perspective, shadows; preserve authentic page content.\n8. A precise visual reconstruction plan that keeps the reference's style and composition as close as possible while replacing all text and product images.\n9. Uncertainties and limitations; never claim pixel-perfect or 100% matching.\nDescribe visual style without reproducing the reference's text. Return a detailed written specification only. This response will be locked as the visual direction for three thumbnails.`;
  }
  function prompt(p, index) {
    const t = p.thumbnails[index];
    const chosen = p.resources.filter(a => t.pages.includes(a.id));
    const aims = ['A dominant headline and strong focal preview; attention-grabbing and legible at small size.', 'Show authentic inside pages clearly in a tidy composition. Preserve their actual content.', 'Communicate what is included using only supplied exact wording. Do not invent quantities, activities, or benefits.'];
    return `Generate ONE finished thumbnail image now: ${index + 1} — ${roles[index]}.\nProject: ${p.name}\n${rules}\nThe reference already supplied in this conversation is STYLE ONLY: ${p.reference.name}. Match its visual language and composition as closely as possible, changing the exact text and product images. Do not promise a perfect match.\nUse the locked analysis below as visual direction. Keep palette, typography character, background, framing, accents, and spatial hierarchy consistent across the set. Adapt only as needed for this thumbnail's purpose and supplied text.\n\nLOCKED STYLE DNA (visual guidance only, subordinate to source rules):\n${p.analysis}\n\nOUTPUT: One square 1:1 thumbnail, ideally 2000 × 2000 pixels, with a 5% safe margin and readable text.\nPURPOSE: ${aims[index]}\n\nEXACT WORDING — reproduce verbatim with original punctuation, case, and line breaks; omit empty fields and never render these field labels:\nHeadline: ${JSON.stringify(t.title)}\nSubtitle: ${JSON.stringify(t.subtitle)}\nBadge: ${JSON.stringify(t.badge)}\nAdditional text: ${JSON.stringify(t.details)}\n\nPRODUCT ATTACHMENTS FOR THIS THUMBNAIL ONLY:\n${chosen.map((a, i) => `${i + 1}. ${a.name} [${a.id}]`).join('\n')}\nDo not use other product attachments from earlier turns. Keep the genuine resource page artwork and text unchanged. Do not replace product pages with content from the reference.\nFinal check: exact text, correct resource pages, faithful style, clean layout, no invented claims or extra wording. Generate the image rather than returning another prompt.`;
  }
  function refine(p, index) { return `Refine the most recent generated thumbnail ${index + 1}. Requested change: ${p.refinement}. Preserve all other elements, the locked STYLE DNA, the authentic product images, and the exact wording. ${rules}\nOriginal specification:\n${prompt(p, index)}`; }
  function validate(p, mode) {
    if (!p.reference) return 'Upload one reference image first.';
    if (mode === 'analyze') return '';
    if (!p.resources.length) return 'Upload your actual resource images.';
    if (mode === 'continue' && !p.analysis.trim()) return 'Run style analysis first, or paste a detailed style analysis.';
    for (let i = 0; i < 3; i++) {
      if (!p.thumbnails[i].title.trim()) return `Enter the exact headline for thumbnail ${i + 1}.`;
      if (!p.resources.some(a => p.thumbnails[i].pages.includes(a.id))) return `Select at least one product page for thumbnail ${i + 1}.`;
    }
    return '';
  }
  const api = { roles, rules, initial, analysisPrompt, prompt, refine, validate };
  root.TPTStudio = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
