export type InflectionType =
  | "past"
  | "present-participle"
  | "plural"
  | "third-person"
  | "comparative"
  | "superlative"
  | "general-inflection";

export interface InflectionDetection {
  isInflected: boolean;
  rootWord: string | null;
  type: InflectionType | null;
  label: string | null;
}

// Map of common irregular English verbs (inflected -> root lemma)
const IRREGULAR_VERB_MAP: Record<string, string> = {
  spun: "spin",
  wrote: "write",
  written: "write",
  swam: "swim",
  swum: "swim",
  flew: "fly",
  flown: "fly",
  drew: "draw",
  drawn: "draw",
  threw: "throw",
  thrown: "throw",
  knew: "know",
  known: "know",
  grew: "grow",
  grown: "grow",
  blew: "blow",
  blown: "blow",
  spoke: "speak",
  spoken: "speak",
  broke: "break",
  broken: "break",
  chose: "choose",
  chosen: "choose",
  drove: "drive",
  driven: "drive",
  rode: "ride",
  ridden: "ride",
  rose: "rise",
  risen: "rise",
  arose: "arise",
  arisen: "arise",
  stole: "steal",
  stolen: "steal",
  woke: "wake",
  woken: "wake",
  froze: "freeze",
  frozen: "freeze",
  began: "begin",
  begun: "begin",
  drank: "drink",
  drunk: "drink",
  sang: "sing",
  sung: "sing",
  sank: "sink",
  sunk: "sink",
  rang: "ring",
  rung: "ring",
  sprang: "spring",
  sprung: "spring",
  ran: "run",
  came: "come",
  became: "become",
  shook: "shake",
  shaken: "shake",
  took: "take",
  taken: "take",
  mistook: "mistake",
  mistaken: "mistake",
  fell: "fall",
  fallen: "fall",
  ate: "eat",
  eaten: "eat",
  beat: "beat",
  beaten: "beat",
  gave: "give",
  given: "give",
  forgave: "forgive",
  forgiven: "forgive",
  hid: "hide",
  hidden: "hide",
  bit: "bite",
  bitten: "bite",
  got: "get",
  gotten: "get",
  forgot: "forget",
  forgotten: "forget",
  wove: "weave",
  woven: "weave",
  wore: "wear",
  worn: "wear",
  tore: "tear",
  torn: "tear",
  swore: "swear",
  sworn: "swear",
  bore: "bear",
  borne: "bear",
  lay: "lie",
  lain: "lie",
  laid: "lay",
  paid: "pay",
  said: "say",
  held: "hold",
  beheld: "behold",
  uphold: "uphold",
  upheld: "uphold",
  sold: "sell",
  told: "tell",
  foretold: "foretell",
  heard: "hear",
  made: "make",
  met: "meet",
  led: "lead",
  fled: "flee",
  bled: "bleed",
  fed: "feed",
  sped: "speed",
  bent: "bend",
  lent: "lend",
  sent: "send",
  spent: "spend",
  built: "build",
  caught: "catch",
  taught: "teach",
  thought: "think",
  brought: "bring",
  bought: "buy",
  fought: "fight",
  sought: "seek",
  ground: "grind",
  wound: "wind",
  bound: "bind",
  found: "find",
  stood: "stand",
  understood: "understand",
  withstood: "withstand",
  struck: "strike",
  stuck: "stick",
  swung: "swing",
  hung: "hang",
  dug: "dig",
  clung: "cling",
  flung: "fling",
  stung: "sting",
  strung: "string",
  wrung: "wring",
  swept: "sweep",
  wept: "weep",
  crept: "creep",
  slept: "sleep",
  felt: "feel",
  burnt: "burn",
  dreamt: "dream",
  leapt: "leap",
  lost: "lose",
  shot: "shoot",
};

/**
 * Detects if a definition string is a tautological grammatical reference to a root lemma
 */
export function detectInflectionFromDefinition(
  def: string,
): InflectionDetection {
  if (!def) {
    return { isInflected: false, rootWord: null, type: null, label: null };
  }

  const clean = def
    .trim()
    .toLowerCase()
    .replace(/^[-*•]\s*/, "");

  // 1. Simple past & past participle
  // e.g. "simple past and past participle of graft", "simple past of dispose", "past participle of halt"
  const pastMatch = clean.match(
    /^(?:simple past and past participle of|simple past tense and past participle of|past participle and simple past of|past tense and past participle of|simple past of|past participle of|past tense of)\s+([a-zA-Z'-]+)/i,
  );
  if (pastMatch && pastMatch[1]) {
    return {
      isInflected: true,
      rootWord: pastMatch[1].toLowerCase().replace(/[.,;:]+$/, ""),
      type: "past",
      label: "Past tense & participle",
    };
  }

  // 2. Present participle & gerund
  // e.g. "present participle and gerund of spurt", "present participle of grin", "gerund of scavenge"
  const presentParticipleMatch = clean.match(
    /^(?:present participle and gerund of|gerund and present participle of|present participle of|gerund of)\s+([a-zA-Z'-]+)/i,
  );
  if (presentParticipleMatch && presentParticipleMatch[1]) {
    return {
      isInflected: true,
      rootWord: presentParticipleMatch[1].toLowerCase().replace(/[.,;:]+$/, ""),
      type: "present-participle",
      label: "Present participle / Gerund",
    };
  }

  // 3. Plural of noun
  // e.g. "plural of hawker", "plural form of deluge"
  const pluralMatch = clean.match(
    /^(?:plural of|plural form of)\s+([a-zA-Z'-]+)/i,
  );
  if (pluralMatch && pluralMatch[1]) {
    return {
      isInflected: true,
      rootWord: pluralMatch[1].toLowerCase().replace(/[.,;:]+$/, ""),
      type: "plural",
      label: "Plural form",
    };
  }

  // 4. Third person singular present
  // e.g. "third-person singular simple present indicative of deluge"
  const thirdPersonMatch = clean.match(
    /^(?:third-person singular (?:simple )?present indicative of|third-person singular of)\s+([a-zA-Z'-]+)/i,
  );
  if (thirdPersonMatch && thirdPersonMatch[1]) {
    return {
      isInflected: true,
      rootWord: thirdPersonMatch[1].toLowerCase().replace(/[.,;:]+$/, ""),
      type: "third-person",
      label: "Third-person singular present",
    };
  }

  // 5. Comparative / Superlative
  // e.g. "comparative of fast", "superlative of bright"
  const compMatch = clean.match(
    /^(?:comparative of|comparative form of)\s+([a-zA-Z'-]+)/i,
  );
  if (compMatch && compMatch[1]) {
    return {
      isInflected: true,
      rootWord: compMatch[1].toLowerCase().replace(/[.,;:]+$/, ""),
      type: "comparative",
      label: "Comparative form",
    };
  }

  const superMatch = clean.match(
    /^(?:superlative of|superlative form of)\s+([a-zA-Z'-]+)/i,
  );
  if (superMatch && superMatch[1]) {
    return {
      isInflected: true,
      rootWord: superMatch[1].toLowerCase().replace(/[.,;:]+$/, ""),
      type: "superlative",
      label: "Superlative form",
    };
  }

  // 6. Generic inflection
  const genericMatch = clean.match(
    /^(?:inflection of|alternative form of|alternative spelling of)\s+([a-zA-Z'-]+)/i,
  );
  if (genericMatch && genericMatch[1]) {
    return {
      isInflected: true,
      rootWord: genericMatch[1].toLowerCase().replace(/[.,;:]+$/, ""),
      type: "general-inflection",
      label: "Inflected form",
    };
  }

  return { isInflected: false, rootWord: null, type: null, label: null };
}

/**
 * Guesses possible root lemmas morphologically if direct lookup yields no definition
 */
export function guessMorphologicalRoot(word: string): {
  candidates: string[];
  probableType: InflectionType | null;
} {
  const w = word.trim().toLowerCase();

  // Check irregular table first
  if (IRREGULAR_VERB_MAP[w]) {
    return { candidates: [IRREGULAR_VERB_MAP[w]], probableType: "past" };
  }

  const candidates: string[] = [];
  let probableType: InflectionType | null = null;

  // 1. Ends in -ing
  if (w.endsWith("ing") && w.length > 4) {
    probableType = "present-participle";
    const base = w.slice(0, -3);

    // Double consonant rule: grinning -> grin, spurting -> spurt
    if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) {
      candidates.push(base.slice(0, -1)); // e.g. grin
    }
    // Silent e rule: sparkling -> sparkle, scavenging -> scavenge
    candidates.push(base + "e");
    // Direct drop: gasping -> gasp, spurting -> spurt
    candidates.push(base);
  }

  // 2. Ends in -ed
  else if (w.endsWith("ed") && w.length > 3) {
    probableType = "past";
    const base = w.slice(0, -2);

    // Double consonant: counselled -> counsel, stopped -> stop
    if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) {
      candidates.push(base.slice(0, -1)); // e.g. counsel
    }
    // Ending in -d only (where root ended in e): disposed -> dispose, outraged -> outrage
    candidates.push(w.slice(0, -1)); // dispose
    // Direct drop: grafted -> graft, halted -> halt
    candidates.push(base); // graft
  }

  // 3. Ends in -ies / -es / -s
  else if (w.endsWith("ies") && w.length > 4) {
    probableType = "plural";
    candidates.push(w.slice(0, -3) + "y");
  } else if (w.endsWith("es") && w.length > 3) {
    probableType = "plural";
    candidates.push(w.slice(0, -1)); // e.g. deluges -> deluge
    candidates.push(w.slice(0, -2)); // e.g. boxes -> box
  } else if (w.endsWith("s") && w.length > 2) {
    probableType = "plural";
    candidates.push(w.slice(0, -1)); // e.g. hawkers -> hawker
  }

  return { candidates, probableType };
}

/**
 * Transforms a root definition into an informative explanation appropriate for the inflected form
 */
export function formatInflectedDefinition(
  rootDef: string,
  type: InflectionType | null,
  label: string | null,
): string {
  if (!rootDef) return "";

  // Strip leading "To " for past / participle if desired, or prepend the grammatical label
  const tag = label ? `(${label}) ` : "";
  return `${tag}${rootDef}`;
}

/**
 * Generates 2-3 natural sentences containing the inflected word in correct grammatical context
 */
export function generateInflectionExamples(
  word: string,
  type: InflectionType | null,
  pos: string,
  count = 3,
): string[] {
  const w = word.trim();
  const lowerPos = pos.toLowerCase();
  const examples: string[] = [];

  if (type === "past" || (lowerPos.includes("verb") && w.endsWith("ed"))) {
    examples.push(
      `The team ${w} their operations until further instructions arrived from headquarters.`,
      `She was deeply ${w} by the unexpected turn of events during the meeting.`,
      `He carefully ${w} the remaining pieces into a cohesive structure.`,
    );
  } else if (type === "present-participle" || w.endsWith("ing")) {
    examples.push(
      `He stood by the window, ${w} quietly as the light faded into evening.`,
      `They observed the fountain ${w} clear water high into the morning air.`,
      `She spent hours ${w} through the archives to locate the missing document.`,
    );
  } else if (type === "plural" || w.endsWith("s")) {
    examples.push(
      `The local ${w} gathered early in the square to prepare their daily exhibits.`,
      `Multiple sudden ${w} swept across the region, overwhelming the drainage canals.`,
      `Scholars compared various ${w} preserved from centuries of documented history.`,
    );
  } else {
    examples.push(
      `The author skillfully incorporated ${w} to emphasize the underlying theme.`,
      `In every chapter, the presence of ${w} provided an unmistakable atmosphere.`,
      `Observers noted that ${w} altered the entire perspective of the scene.`,
    );
  }

  return examples.slice(0, count);
}
