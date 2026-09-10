type GeneratedKitKey =
  | 'ecommerce-product-page-conversion-kit'
  | 'ai-social-media-content-kit'
  | 'freelancer-client-management-kit';

type ZipFile = { name: string; content: string };

const encoder = new TextEncoder();

function csvCell(value: string | number) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(headers: string[], rows: Array<Array<string | number>>) {
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function makeZip(files: ZipFile[]) {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let localOffset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);

    const localHeader = new Uint8Array(30);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    locals.push(localHeader, name, data);

    const centralHeader = new Uint8Array(46);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, localOffset, true);
    centrals.push(centralHeader, name);

    localOffset += localHeader.length + name.length + data.length;
  }

  const localBytes = concat(locals);
  const centralBytes = concat(centrals);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralBytes.length, true);
  ev.setUint32(16, localBytes.length, true);
  ev.setUint16(20, 0, true);
  return concat([localBytes, centralBytes, end]);
}

const LICENSE = `SUMMECA DIGITAL PRODUCT LICENSE\n\nYou may use the included templates, prompts, planners, and frameworks for your own business and for client-service work. You may customize the materials and use the resulting work in commercial projects.\n\nYou may not resell, redistribute, upload, share, sublicense, or give away the original SUMMECA files or substantially identical copies as a competing template pack.\n\nNo outcome is guaranteed. You remain responsible for verifying facts, claims, legal requirements, taxes, contracts, advertising rules, and platform policies that apply to your use.\n\nCopyright SUMMECA. All rights reserved.\n`;

function ecommerceFiles(): ZipFile[] {
  const intents = [
    'clarify the core value proposition', 'turn verified features into customer benefits', 'reduce uncertainty before purchase',
    'make the opening paragraph easier to scan', 'improve product-title clarity', 'surface the strongest differentiator',
    'rewrite technical facts in plain language', 'create concise benefit bullets', 'address a common buyer objection',
    'improve the call to action', 'write a mobile-friendly short description', 'organize product information logically',
    'improve trust without inventing proof', 'highlight compatibility facts', 'explain who the product is for',
    'explain the primary use case', 'improve SEO wording naturally', 'write a useful meta description',
    'write accurate image alt text', 'perform a final factual QA pass'
  ];
  const frames = [
    'Use only the verified facts provided. Return a concise draft plus a short fact-check note.',
    'Write in clear benefit-led language. Do not add claims, certifications, guarantees, reviews, scarcity, or specifications.',
    'Give three options: conservative, balanced, and bold-but-factual.',
    'Optimize for clarity and skimmability on mobile while preserving every material product fact.',
    'Explain the reasoning in one sentence, then provide ready-to-paste copy.'
  ];
  const prompts = intents.flatMap((intent, i) => frames.map((frame, j) => [i * frames.length + j + 1, `Help me ${intent} for this ecommerce product page. ${frame} Product facts: [PASTE VERIFIED FACTS]. Audience: [AUDIENCE]. Brand voice: [VOICE].`]));

  const titlePatterns = [
    '[Product Type] — [Primary Verified Benefit]', '[Brand/Product] | [Key Feature] for [Audience]', '[Product Type] with [Verified Feature] — [Use Case]',
    '[Size/Variant] [Product Type] — [Primary Use Case]', '[Product Type] for [Audience] — [Verified Differentiator]', '[Material] [Product Type] — [Verified Benefit]',
    '[Product Type]: [Feature] + [Feature]', '[Product Name] — Built for [Use Case]', '[Product Type] — [Compatibility Fact]', '[Product Type] — [Outcome phrased without guarantee]'
  ];
  const titles = Array.from({ length: 50 }, (_, i) => [i + 1, titlePatterns[i % titlePatterns.length], `Variation ${Math.floor(i / titlePatterns.length) + 1}: keep the wording natural, specific, and fact-checked.`]);

  const benefitFrames = [
    '[Verified feature] → helps the customer [practical benefit].', 'Designed for [use case], with [verified fact] for clearer everyday value.',
    '[Verified specification], so buyers can quickly understand [relevant implication].', 'Made with [verified material] for [factual property only].',
    'Compatible with [verified compatibility], helping customers confirm fit before ordering.', 'Includes [verified included item], so buyers know exactly what arrives.',
    '[Verified dimension/capacity] for [relevant use case].', 'Use [verified function] to [practical customer task].'
  ];
  const benefits = Array.from({ length: 80 }, (_, i) => [i + 1, benefitFrames[i % benefitFrames.length], 'Replace every bracket with verified product information; remove the line if the fact is unavailable.']);

  const ctaVerbs = ['Shop', 'Choose', 'Get', 'Explore', 'Add', 'Upgrade', 'Try', 'View', 'Select', 'Order'];
  const ctaEnds = ['Your Option', 'the Right Fit', 'Your Setup', 'the Details', 'Your Preferred Variant', 'with Confidence'];
  const ctas = Array.from({ length: 60 }, (_, i) => [i + 1, `${ctaVerbs[i % ctaVerbs.length]} ${ctaEnds[Math.floor(i / ctaVerbs.length) % ctaEnds.length]}`, 'Use only when it accurately matches the buying action on the page.']);

  const planner = csv(
    ['Product', 'URL', 'Audience', 'Verified Facts', 'Primary Benefit', 'Title Draft', 'Description Draft', 'Benefit Bullets', 'CTA', 'Meta Title', 'Meta Description', 'Alt Text', 'QA Status'],
    Array.from({ length: 20 }, (_, i) => [`Product ${i + 1}`, '', '', '', '', '', '', '', '', '', '', '', 'Not Started'])
  );

  return [
    { name: 'START_HERE.txt', content: `SUMMECA — Ecommerce Product Page Conversion Kit\n\nUse this kit to improve ecommerce product-page clarity without inventing product facts.\n\nSuggested workflow:\n1. Collect the original product page and verified specifications.\n2. Complete the planner.\n3. Use the prompt library to draft titles, descriptions, bullets, CTA, metadata, and alt text.\n4. Compare every claim against the source facts.\n5. Publish only after the QA checklist is complete.\n\nThis toolkit supports copywriting and workflow organization; it does not guarantee conversion, ranking, revenue, or other outcomes.\n` },
    { name: '100_PRODUCT_DESCRIPTION_PROMPTS.csv', content: csv(['#', 'Prompt'], prompts) },
    { name: '50_PRODUCT_TITLE_FORMULAS.csv', content: csv(['#', 'Formula', 'Guidance'], titles) },
    { name: '80_BENEFIT_BULLET_TEMPLATES.csv', content: csv(['#', 'Template', 'Safety Note'], benefits) },
    { name: '60_CTA_OPTIONS.csv', content: csv(['#', 'CTA', 'Guidance'], ctas) },
    { name: 'SEO_AND_ALT_TEXT_FRAMEWORKS.txt', content: `SEO FRAMEWORKS\n\nMeta title: [Product Type] — [Primary Verified Benefit] | [Brand]\nMeta description: Discover [product type] with [verified feature]. Built for [audience/use case]. Review specifications and choose your preferred option.\nImage alt: [Product name/type] in [verified color/variant], showing [visible feature].\n\nRules:\n- Write for humans first.\n- Keep keywords natural.\n- Never insert a feature simply because it is a popular search term.\n- Alt text should describe what is visibly shown and relevant.\n` },
    { name: 'PRODUCT_PAGE_QA_CHECKLIST.txt', content: `PRODUCT PAGE QA CHECKLIST\n\n[ ] Title states the product clearly.\n[ ] Every specification matches the verified source.\n[ ] Benefits are traceable to real features.\n[ ] No invented certification, review, guarantee, scarcity, health, safety, or performance claim.\n[ ] Description is easy to scan on mobile.\n[ ] CTA matches the real action.\n[ ] Meta title and description are unique and factual.\n[ ] Alt text accurately describes the image.\n[ ] Price, variant, compatibility, dimensions, materials, and included items were rechecked.\n[ ] Final copy was proofread before publication.\n` },
    { name: 'BEFORE_AFTER_EXAMPLES.txt', content: `BEFORE / AFTER EXAMPLES\n\n1) BEFORE: Wireless Charger 15W\nAFTER: 15W Wireless Charging Pad — Cable-Free Everyday Charging\nUse only when 15W output and wireless charging compatibility are verified.\n\n2) BEFORE: Steel Bottle 750ml\nAFTER: 750ml Stainless-Steel Water Bottle — Everyday Hydration in a Reusable Design\nDo not claim insulation duration unless supplied and verified.\n\n3) BEFORE: Desk Lamp\nAFTER: Adjustable Desk Lamp — Focused Light for Work and Study\nOnly mention brightness modes, power method, color temperature, or dimensions when verified.\n\n4) BEFORE: Laptop Stand\nAFTER: Adjustable Laptop Stand — Raise Your Screen for a Cleaner Desk Setup\nAvoid ergonomic or medical claims unless supported appropriately.\n\n5) BEFORE: Travel Organizer\nAFTER: Travel Organizer — Keep Everyday Essentials Sorted in One Place\nDescribe pockets, dimensions, materials, and water resistance only from source facts.\n` },
    { name: 'PRODUCT_PAGE_PLANNER.csv', content: planner },
    { name: 'LICENSE.txt', content: LICENSE },
  ];
}

function socialFiles(): ZipFile[] {
  const topics = [
    'teach one useful principle', 'explain a common mistake', 'share a simple checklist', 'answer a frequently asked question', 'break down a process',
    'compare two approaches', 'explain a myth', 'show a before/after workflow', 'share a practical example', 'turn a customer question into content',
    'explain a product feature factually', 'show how to use a product', 'address a buying objection', 'share a behind-the-scenes step', 'create a mini case-study structure',
    'write an educational carousel outline', 'create a short-video script', 'write a discussion post', 'write a soft promotional post', 'write a direct offer post',
    'repurpose a long article', 'repurpose a customer FAQ', 'summarize a lesson learned', 'create a resource list', 'write a problem-awareness post',
    'write a solution-awareness post', 'write a trust-building post', 'create a poll question', 'write a founder/creator perspective', 'plan a weekly content series'
  ];
  const formats = ['Instagram caption', 'X post', 'X thread', 'LinkedIn post', 'Facebook post', 'short-video script', 'carousel outline', 'FAQ post', 'checklist post', 'email-to-social repurpose'];
  const prompts = topics.flatMap((topic, i) => formats.map((format, j) => [i * formats.length + j + 1, format, `Create a ${format} that will ${topic}. Audience: [AUDIENCE]. Offer/topic: [TOPIC]. Brand voice: [VOICE]. Use only facts I provide, avoid fabricated results or testimonials, and end with a relevant CTA when appropriate.`]));

  const hookPatterns = [
    'Most people overcomplicate [topic]. Start here:', 'Before you [action], check these three things:', 'A simple way to think about [topic]:', 'If [problem] keeps happening, look at this first:',
    'You do not need [common assumption] to improve [goal].', 'Here is the checklist I would use for [task]:', 'One mistake that makes [task] harder than it needs to be:',
    'The difference between [A] and [B] in plain language:', 'Save this for the next time you [task]:', 'What I would fix first if [situation]:',
    'A better question to ask about [topic]:', 'Three signs it is time to revisit [process]:', 'The beginner-friendly version of [topic]:',
    'A five-minute audit for [area]:', 'If I had to explain [topic] in one post:', 'A practical framework for [goal]:',
    'Before buying [category], compare these facts:', 'What actually matters when choosing [category]:', 'Turn this vague goal into a clear next step:', 'Here is the process, without the fluff:',
    'A useful template for [task]:', 'Try this when you are stuck on [problem]:', 'One small change that can improve clarity:', 'Use this prompt when you need to [task]:'
  ];
  const angles = ['Educational', 'Practical', 'Contrarian-but-grounded', 'Checklist', 'Problem/Solution'];
  const hooks = hookPatterns.flatMap((pattern, i) => angles.map((angle, j) => [i * angles.length + j + 1, angle, pattern]));

  const ctaGoals = ['Save this post', 'Share with a teammate', 'Reply with your question', 'Visit the product page', 'Compare the options', 'Download the resource', 'Join the discussion', 'Read the full guide', 'Try the framework', 'Review the checklist', 'Follow for the next part', 'Send this to someone who needs it', 'Bookmark for later', 'Tell us your experience', 'See what is included', 'Choose your preferred option'];
  const tones = ['Direct', 'Friendly', 'Professional', 'Low-pressure', 'Action-oriented'];
  const ctas = ctaGoals.flatMap((goal, i) => tones.map((tone, j) => [i * tones.length + j + 1, tone, goal]));

  const plannerRows = Array.from({ length: 30 }, (_, i) => [i + 1, '', ['Core Skill', 'Customer Problem', 'Process', 'Offer', 'Industry Insight'][i % 5], ['Educate', 'Build Trust', 'Discuss', 'Promote', 'Show Process'][i % 5], formats[i % formats.length], '', '', '', 'Idea', '', '']);

  return [
    { name: 'START_HERE.txt', content: `SUMMECA — AI Social Media Content Kit\n\nThis kit helps creators, freelancers, marketers, and small businesses plan content with reusable AI prompts instead of starting from a blank page.\n\nWorkflow:\n1. Define audience, offer, content pillars, and brand voice.\n2. Choose a prompt, hook, and platform framework.\n3. Replace placeholders with real information.\n4. Fact-check every statement.\n5. Put the draft in the 30-day planner and adapt it to the target platform.\n\nNo reach, follower, engagement, virality, revenue, or sales result is guaranteed.\n` },
    { name: '300_SOCIAL_MEDIA_AI_PROMPTS.csv', content: csv(['#', 'Format', 'Prompt'], prompts) },
    { name: '120_HOOK_LIBRARY.csv', content: csv(['#', 'Angle', 'Hook'], hooks) },
    { name: '80_CTA_LIBRARY.csv', content: csv(['#', 'Tone', 'CTA Goal'], ctas) },
    { name: 'PLATFORM_FRAMEWORKS.txt', content: `PLATFORM FRAMEWORKS\n\nInstagram: Hook → useful body → skimmable spacing → relevant CTA.\nX / Twitter: One clear idea per post. For threads: hook → numbered insights → concise close.\nLinkedIn: Context → useful observation → practical framework/example → discussion CTA.\nFacebook: Conversational opening → value → context → relevant question or CTA.\nShort video: 0–3s hook → problem/context → 2–4 useful points → close/CTA.\n\nAdapt length and format to current platform rules. Do not copy a single draft unchanged across every network.\n` },
    { name: '30_DAY_CONTENT_PLANNER.csv', content: csv(['Day', 'Platform', 'Content Pillar', 'Goal', 'Format', 'Hook', 'Core Message', 'CTA', 'Status', 'Published URL', 'Notes'], plannerRows) },
    { name: 'BRAND_VOICE_WORKSHEET.txt', content: `BRAND VOICE WORKSHEET\n\nAudience: ____________________\nWhat they are trying to achieve: ____________________\nProblems we can truthfully help with: ____________________\nThree brand adjectives: ____________________\nWords we use often: ____________________\nWords/claims we avoid: ____________________\nPreferred sentence length: Short / Mixed / Detailed\nEvidence we can cite: ____________________\nMain CTA: ____________________\nSecondary CTA: ____________________\nContent pillars (3–5): ____________________\n` },
    { name: 'LICENSE.txt', content: LICENSE },
  ];
}

function freelancerFiles(): ZipFile[] {
  const tasks = [
    'turn a lead message into a professional reply', 'prepare discovery questions', 'summarize client requirements', 'identify missing project information', 'draft a project brief',
    'draft a proposal outline', 'write scope inclusions', 'write scope exclusions', 'define project milestones', 'draft a delivery timeline',
    'draft revision boundaries', 'write a project kickoff email', 'write a request for missing assets', 'write a meeting recap', 'turn notes into action items',
    'prepare a client status update', 'write a delay-risk warning', 'draft a change-request reply', 'explain an out-of-scope request politely', 'draft a milestone approval request',
    'write a payment reminder', 'prepare an invoice description', 'draft a final delivery email', 'write handoff instructions', 'request a testimonial',
    'write a follow-up after no reply', 'prepare a project retrospective', 'create a reusable SOP', 'organize a client tracker', 'prepare questions for a renewal conversation',
    'draft a maintenance offer', 'turn feedback into revision tasks', 'prioritize revision requests', 'summarize a contract clause in plain language for internal review', 'prepare questions to ask a lawyer about a contract',
    'prepare questions to ask an accountant about invoicing', 'write a neutral cancellation acknowledgement', 'draft a refund-request acknowledgement', 'create a closeout checklist', 'prepare a portfolio case-study outline',
    'draft a referral request', 'write a professional boundary-setting message', 'create a client onboarding checklist', 'create a pre-delivery QA checklist', 'draft a handover confirmation',
    'create a weekly project update format', 'draft a rescheduling message', 'prepare a client satisfaction survey', 'write a scope clarification question', 'create a reusable follow-up sequence'
  ];
  const modes = ['concise and professional', 'friendly and professional'];
  const prompts = tasks.flatMap((task, i) => modes.map((mode, j) => [i * modes.length + j + 1, `Help me ${task}. Write it in a ${mode} tone. Context: [PASTE CONTEXT]. Preserve facts, dates, prices, and commitments exactly; flag missing information instead of inventing it.`]));

  return [
    { name: 'START_HERE.txt', content: `SUMMECA — Freelancer Client Management Kit\n\nUse these reusable templates to create a consistent workflow from inquiry to project closeout. Replace every placeholder, verify dates/prices/scope, and adapt the documents to your service and jurisdiction.\n\nThese materials are operational templates only and are not legal, tax, accounting, or financial advice.\n` },
    { name: 'CLIENT_INTAKE_TEMPLATE.txt', content: `CLIENT INTAKE\n\nClient / Company: [ ]\nEmail: [ ]\nWebsite: [ ]\nProject: [ ]\nPrimary goal: [ ]\nTarget audience: [ ]\nRequired deliverables: [ ]\nKnown deadline: [ ]\nBudget / approved fee: [ ]\nExisting assets and access: [ ]\nBrand guidelines: [ ]\nStakeholders / approver: [ ]\nSuccess criteria agreed with client: [ ]\nImportant constraints: [ ]\nInformation still missing: [ ]\n` },
    { name: 'PROJECT_BRIEF_TEMPLATE.txt', content: `PROJECT BRIEF\n\nProject name: [ ]\nClient: [ ]\nBackground: [ ]\nObjective: [ ]\nAudience: [ ]\nDeliverables: [ ]\nOut of scope: [ ]\nDependencies: [ ]\nMilestones: [ ]\nReview/approval process: [ ]\nDeadline: [ ]\nFinal handoff format: [ ]\nOpen questions: [ ]\n` },
    { name: 'PROPOSAL_TEMPLATE.txt', content: `PROPOSAL TEMPLATE\n\nPrepared for: [CLIENT]\nPrepared by: [YOUR BUSINESS]\nDate: [DATE]\n\n1. Project summary\n[Describe the client's stated objective.]\n\n2. Scope and deliverables\n[List exactly what is included.]\n\n3. Timeline and milestones\n[List dates or estimated working periods.]\n\n4. Client responsibilities\n[List required content, access, approvals, and response times.]\n\n5. Fee and payment terms\n[Insert agreed price, currency, schedule, and approved payment method.]\n\n6. Revisions and change requests\n[Insert your reviewed policy.]\n\n7. Acceptance\n[Explain how the client confirms acceptance.]\n\nReview this template for legal and tax requirements in your jurisdiction before using it as an agreement.\n` },
    { name: 'SCOPE_OF_WORK_TEMPLATE.txt', content: `SCOPE OF WORK\n\nIncluded:\n- [Deliverable 1]\n- [Deliverable 2]\n- [Deliverable 3]\n\nNot included unless added in writing:\n- [Excluded item 1]\n- [Excluded item 2]\n\nMilestones:\n1. [Milestone] — [Target]\n2. [Milestone] — [Target]\n\nDependencies:\n- [Client asset/access/approval]\n\nCompletion criteria:\n- [What constitutes delivery/approval]\n\nChange requests:\n- Requests that alter agreed deliverables, quantity, complexity, or timeline should be reviewed and approved before work proceeds.\n` },
    { name: 'REVISION_POLICY_TEMPLATE.txt', content: `REVISION POLICY TEMPLATE\n\nIncluded revision rounds: [NUMBER]\nRevision window after delivery: [NUMBER] calendar/business days\nIncluded revisions: adjustments within the agreed brief and scope.\nPotentially out-of-scope changes: new deliverables, new directions after approval, substantial new content, or requests that change the original project requirements.\n\nBefore publishing this policy, adapt it to your service and have any contractual language reviewed where appropriate.\n` },
    { name: 'CLIENT_EMAIL_SCRIPTS.txt', content: `CLIENT EMAIL SCRIPTS\n\nKICKOFF\nSubject: Project kickoff — [PROJECT]\nThanks for moving forward with [PROJECT]. To begin, please send [ASSETS/ACCESS] by [DATE]. I will confirm once everything required is available.\n\nMISSING INFORMATION\nSubject: Information needed for [PROJECT]\nTo keep the project moving, I still need: [LIST]. I will avoid making assumptions about these items until you confirm them.\n\nSTATUS UPDATE\nSubject: [PROJECT] — status update\nCompleted: [ ]. In progress: [ ]. Waiting on: [ ]. Next milestone: [DATE/STEP].\n\nDELIVERY\nSubject: [PROJECT] — delivery ready\nThe agreed deliverables are ready: [LINK/FILES]. Please review them against the approved scope and send any included revision requests by [DATE].\n\nFOLLOW-UP\nSubject: Following up — [PROJECT]\nJust following up on [ITEM]. Once I receive your confirmation, I can proceed with [NEXT STEP].\n` },
    { name: '100_AI_CLIENT_MANAGEMENT_PROMPTS.csv', content: csv(['#', 'Prompt'], prompts) },
    { name: 'CLIENT_PROJECT_TRACKER.csv', content: csv(['Client', 'Company', 'Email', 'Service', 'Status', 'Start Date', 'Due Date', 'Project Fee', 'Amount Paid', 'Balance', 'Next Action'], Array.from({ length: 20 }, () => ['', '', '', '', 'Lead', '', '', '', '', '', ''])) },
    { name: 'INVOICE_TEMPLATE.csv', content: csv(['Description', 'Qty', 'Rate', 'Tax %', 'Line Total', 'Notes'], Array.from({ length: 8 }, () => ['', '', '', '', '', ''])) },
    { name: 'DELIVERY_CHECKLIST.txt', content: `DELIVERY CHECKLIST\n\n[ ] Deliverables match the approved scope.\n[ ] Files open correctly and use clear names.\n[ ] Client-specific facts, names, dates, links, and prices were checked.\n[ ] Sensitive credentials are not included in ordinary deliverables.\n[ ] Required instructions are included.\n[ ] Revision window is stated if applicable.\n[ ] Invoice/payment status is recorded separately.\n[ ] Final client message explains the next action.\n` },
    { name: 'LICENSE.txt', content: LICENSE },
  ];
}

export function isGeneratedDigitalProductKey(value: string): value is GeneratedKitKey {
  return value === 'ecommerce-product-page-conversion-kit'
    || value === 'ai-social-media-content-kit'
    || value === 'freelancer-client-management-kit';
}

export function buildGeneratedDigitalProductBundle(key: GeneratedKitKey) {
  if (key === 'ecommerce-product-page-conversion-kit') return makeZip(ecommerceFiles());
  if (key === 'ai-social-media-content-kit') return makeZip(socialFiles());
  return makeZip(freelancerFiles());
}
