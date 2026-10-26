// Go Colors facts the app may use. Only two sources:
//  1. The verified facts from the company's official filings/investor material (build brief, section 9).
//  2. What the brand's own website (gocolors.com) showed on 26 Oct 2026.
// Nothing else about Go Colors may be stated anywhere in the app, including by the AI.

export const BRAND_NAME = "Go Colors";
export const APP_NAME = "Go Colors Franchise Engine";

export const GO_COLORS_FACTS: { topic: string; fact: string; source: string }[] = [
  { topic: "company", fact: "Go Colors is the brand of Go Fashion (India) Ltd, an Indian apparel retailer.", source: "Company filings" },
  { topic: "stores", fact: "802 exclusive brand outlets (EBOs) as of 31 March 2026.", source: "Company filings / investor material" },
  { topic: "reach", fact: "Present in about 195 cities across 23 states and union territories.", source: "Company filings / investor material" },
  { topic: "store size", fact: "The average EBO is about 540 sq ft; newer stores are 700 sq ft or more.", source: "Company filings / investor material" },
  { topic: "store size", fact: "Management has said very small stores (under about 400 sq ft) cannot display the full range.", source: "Investor material" },
  { topic: "store size", fact: "Stores above 700 sq ft grew faster in Q1 FY27.", source: "Investor material" },
  { topic: "location", fact: "Management cites overlapping catchments and cannibalisation between nearby small stores, and a move from 'availability of space' to 'quality of location and lease'.", source: "Investor material" },
  { topic: "products", fact: "The website sells women's wear, men's wear and girls' wear. Women's categories include leggings and churidar, kurti sets, tops, kurti pants, kurtas and kurtis, wide pants, shirts, palazzos, dresses, flares and shorts.", source: "gocolors.com, 26 Oct 2026" },
  { topic: "franchise enquiry", fact: "The official franchise enquiry form asks for name, address, state, district, 6-digit pin code, email, mobile, whether you have a store location, carpet area (optional) and an image.", source: "gocolors.com franchise enquiry form" },
  { topic: "franchise terms", fact: "Go Colors has not published its franchise fee, royalty, security deposit or onboarding steps.", source: "No public source" },
];

/** A compact block for AI prompts. */
export const BRAND_CONTEXT = GO_COLORS_FACTS.map((f) => `- ${f.fact} (${f.source})`).join("\n");
