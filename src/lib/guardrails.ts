// Chat guardrails, applied before any answer (with or without AI). The chat is a reviewer's tool
// for this franchise review: it explains decisions, takes updates and answers questions about
// Go Colors from verified facts. Anything else gets a short, polite refusal.
import { GO_COLORS_FACTS } from "./brand";

export type GuardResult = { blocked: true; reply: string } | { blocked: false; rewrite?: string; vague?: boolean };

const APP_OR_TER = /\b(APP|TER|ROW)-[\w-]+\b/i;

/** Clear attempts to cheat the checks. Always refused. */
const CHEATING = /\b(cheat|loophole|hack|trick|bypass|game the|fool|fake|forge|work ?around|get (around|past)|beat the (system|checks|score)|lie|hide)\b/i;
/** Questions that try to get past the checks rather than review an applicant. */
const GAMING = /\b(cheat|loophole|hack|trick|bypass|game the|fool|fake|forge|work ?around|get (around|past)|beat the (system|checks|score))\b|\bhow (do|can|could|should) (i|we|you|an? applicants?|someone|they|people) (pass|clear|get (approved|selected|through|a slot|good to go)|avoid (a )?hold|score higher|qualify)|\bwhat (should|do|must) (i|we|they|an? applicants?) (write|enter|fill|put|say|type|answer)\b|\bwhat (answers?|values?|inputs?) (get|gets|will get|guarantee)/i;

/** Commercial terms the brand has not published. */
const PRICING = /\b(franchise fee|royalt(y|ies)|security deposit|deposit amount|commission|margin|price list|pricing|how much (does|will|is) (it|the franchise|a franchise|go colors) (cost|charge)|cost of (the|a) franchise|revenue share)\b/i;
/** Returns and payback: not in the file and not published, so the answer is simply that. */
const RETURNS = /\b(profit|profits|profitability|payback|break-?even|roi|return on investment|returns|earnings|how much (will|can|could) (i|we|they|the store) (earn|make))\b/i;

/** Attempts to change the chat's instructions or read them. */
const INJECTION = /\b(ignore|disregard|forget) (all |any |the )?(previous|above|earlier|prior) (instructions|rules|prompts?)|\b(system prompt|your instructions|your rules|developer mode|jailbreak|act as|pretend (to be|you are)|you are now)\b/i;

/** Small talk gets a friendly pointer, not a refusal. */
const GREETING = /^\s*(hi+|hello|hey|hiya|namaste|namaskara|good (morning|afternoon|evening)|yo)\b[\s!.?,]*(there|team)?[\s!.?]*$/i;
const THANKS = /^\s*(thanks|thank you|thank u|thx|ty|ok|okay|cool|great|nice|got it|perfect|awesome)\b[\s\w!.,]{0,20}$/i;
const EXAMPLES = "For example: 'Summarise the results', 'Why is APP-007 on hold?', 'Who is on the waitlist?', 'What if APP-006 had a 700 sq ft space?', or 'APP-009 is now renting a 600 sq ft shop'.";

/** Clearly unrelated requests. Anything not clearly unrelated is answered from the data. */
const OFF_TOPIC = /\b(weather|temperature|poem|poetry|song|lyrics|joke|recipe|cook|cricket|football|ipl|match score|who won|movie|film|netflix|news|politic|election|prime minister|stock price|share price|sensex|nifty|bitcoin|crypto|homework|essay|story|translate this|capital of|celebrity|horoscope|dating)\b|\bwrite (me )?(a|an|some) (code|program|script|email to my|letter to my)/i;

/** Words that show the question is about this review or the brand. */
const ON_TOPIC = /\b(summar|result|cheap|expensive|budget|invest|money|best|top|highest|lowest|strong|weak|rank|compare|recommend|pick|choose|select|shortlist|risk|ready|approv|reject|everyone|anyone|how many|list|applicant|application|status|holds?|waitlist|wait-?list|good to go|decision|contested|pin|territor|store|slot|capacity|score|reason|why|onboard|paperwork|gst|agreement|training|launch|check-?in|franchise|partner|space|sq ?ft|floor|rent|owned|investment|lakh|experience|city|bengaluru|mysuru|mangaluru|hubballi|dharwad|belagavi|tumakuru|davanagere|karnataka|go ?colors|go fashion|outlet|ebo|summary|overview|what if|deal terms|frontage|visibility|good to go|on hold|reviewer)/i;

export const SCOPE_NOTE =
  "I can explain decisions on these applications, take updates about an applicant, run what-ifs, and share verified facts about Go Colors.";

export function guard(question: string): GuardResult {
  const q = question.trim();
  if (INJECTION.test(q)) {
    return { blocked: true, reply: `I can't change how I work or share my instructions. ${SCOPE_NOTE}` };
  }
  const passFor = q.match(/\bhow (?:do|does|can|could|should|will|would) ((?:APP|ROW)-[\w-]+) (?:pass|clear|qualify|get (?:approved|selected|through|a slot|good to go)|avoid (?:a )?hold|score higher)/i);
  if (passFor && !CHEATING.test(q)) return { blocked: false, rewrite: `What would change ${passFor[1].toUpperCase()}?` };
  if (GAMING.test(q) && !/\bwhat would change\b/i.test(q)) {
    const id = q.match(APP_OR_TER)?.[0];
    if (!CHEATING.test(q) && id && /^APP|^ROW/i.test(id)) return { blocked: false, rewrite: `What would change ${id.toUpperCase()}?` };
    if (!CHEATING.test(q)) {
      return {
        blocked: true,
        reply: "Everyone goes through the same checks, shown on every applicant's page: the required details are filled in, the pin is valid and in a listed city and territory, a space is identified, and no store already sits on that pin. Those who pass are ranked by score within their territory. I won't suggest what to write to get through. For one applicant, ask 'What would change APP-004?'",
      };
    }
    return {
      blocked: true,
      reply: "I can't help anyone get around the checks or tell them what to enter to pass. Every applicant is assessed on what they actually have. For a specific applicant, I can tell you what would change their status, for example: 'What would change APP-004?'",
    };
  }
  if (RETURNS.test(q)) {
    return { blocked: true, reply: "Profit, payback and returns are not in this file, and Go Colors has not published figures for them that I have, so I can't give a number. The engine does not use them in any score." };
  }
  if (PRICING.test(q)) {
    const note = GO_COLORS_FACTS.find((f) => f.topic === "franchise terms")!.fact;
    return { blocked: true, reply: `${note} I won't guess figures. Any terms you agree are typed into the deal terms on the store's onboarding page.` };
  }
  if (GREETING.test(q)) return { blocked: true, reply: `Hi! I can explain the decisions on these applications, run what-ifs and take new information about an applicant. ${EXAMPLES}` };
  if (THANKS.test(q)) return { blocked: true, reply: "Happy to help. Ask me anything else about the applications." };
  if (OFF_TOPIC.test(q) && !APP_OR_TER.test(q)) {
    return { blocked: true, reply: `That's outside what I can help with here. ${SCOPE_NOTE} ${EXAMPLES}` };
  }
  // Not clearly about the review, but not clearly unrelated either: let the data answer it.
  if (!APP_OR_TER.test(q) && !ON_TOPIC.test(q)) return { blocked: false, vague: true };
  return { blocked: false };
}

/** Answers questions about Go Colors from the verified facts only. Null when it isn't a brand question. */
export function brandAnswer(question: string): string | null {
  if (!/\b(go ?colors|go fashion|the brand|the company)\b/i.test(question) || APP_OR_TER.test(question)) return null;
  const q = question.toLowerCase();
  const pick = (topics: string[]) => GO_COLORS_FACTS.filter((f) => topics.includes(f.topic));
  let facts = GO_COLORS_FACTS.filter((f) => f.topic !== "franchise terms");
  if (/how many stores|outlets|ebo|store count|number of stores/.test(q)) facts = pick(["stores", "reach"]);
  else if (/cities|states|where|presence|reach/.test(q)) facts = pick(["reach"]);
  else if (/size|sq ?ft|square|small store|big store/.test(q)) facts = pick(["store size"]);
  else if (/sell|product|range|categor|wear|clothes|kurti|leggings/.test(q)) facts = pick(["products"]);
  else if (/location|catchment|cannibal|lease/.test(q)) facts = pick(["location"]);
  else if (/enquiry|form|apply|application form/.test(q)) facts = pick(["franchise enquiry"]);
  return facts.map((f) => `${f.fact} (Source: ${f.source}.)`).join("\n");
}
