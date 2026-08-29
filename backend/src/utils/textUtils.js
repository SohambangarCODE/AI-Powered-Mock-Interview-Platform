const normalize = (str = "") => String(str).trim().toLowerCase().replace(/\s+/g, " ");

// Comparing long free-text answers against every previous answer gets expensive
// fast (Levenshtein is O(n*m)), so cap how much text we actually diff.
const COMPARE_LIMIT = 600;

/**
 * Levenshtein distance, two-row DP so memory is O(min(n, m)) instead of O(n*m).
 */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  // Iterate over the shorter string in the inner loop.
  if (a.length > b.length) [a, b] = [b, a];

  let prev = new Array(a.length + 1);
  let curr = new Array(a.length + 1);
  for (let i = 0; i <= a.length; i++) prev[i] = i;

  for (let j = 1; j <= b.length; j++) {
    curr[0] = j;
    for (let i = 1; i <= a.length; i++) {
      curr[i] = a[i - 1] === b[j - 1]
        ? prev[i - 1]
        : 1 + Math.min(prev[i], curr[i - 1], prev[i - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[a.length];
}

/**
 * 0..1 similarity between two strings. 1 = identical after normalization.
 */
function similarityRatio(a, b) {
  const na = normalize(a).slice(0, COMPARE_LIMIT);
  const nb = normalize(b).slice(0, COMPARE_LIMIT);
  if (!na.length && !nb.length) return 1;
  if (!na.length || !nb.length) return 0;
  if (na === nb) return 1;

  // Strings of very different lengths can't be near-duplicates, so skip the
  // expensive comparison entirely.
  const ratio = Math.min(na.length, nb.length) / Math.max(na.length, nb.length);
  if (ratio < 0.75) return 0;

  return 1 - levenshtein(na, nb) / Math.max(na.length, nb.length);
}

/**
 * Has the candidate already given this answer?
 *
 * Checks against ALL previous answers, not just the most recent one — otherwise
 * alternating A, B, A slips through.
 *
 * @param {string} newAnswer
 * @param {string[]|string} previousAnswers
 */
function isRepeatedAnswer(newAnswer, previousAnswers) {
  if (!newAnswer) return false;
  const history = Array.isArray(previousAnswers)
    ? previousAnswers
    : [previousAnswers];

  const na = normalize(newAnswer);
  if (!na) return false;

  return history.some((prev) => {
    if (!prev) return false;
    const pa = normalize(prev);
    if (!pa) return false;
    if (na === pa) return true;
    return na.length > 15 && similarityRatio(na, pa) > 0.85;
  });
}

/**
 * Would asking this question repeat one we've already asked?
 */
function isDuplicateQuestion(candidate, previousQuestions = [], threshold = 0.8) {
  if (!candidate) return false;
  const nc = normalize(candidate);
  if (!nc) return false;

  return previousQuestions.some((q) => {
    if (!q) return false;
    const nq = normalize(q);
    if (!nq) return false;
    if (nc === nq) return true;
    // One question containing the other verbatim is a duplicate however it's
    // dressed up (e.g. a "Let's go deeper — <same question>" restatement).
    if (nc.includes(nq) || nq.includes(nc)) return true;
    return similarityRatio(nc, nq) > threshold;
  });
}

/**
 * Repair the two ways a model commonly breaks otherwise-valid JSON:
 *
 * 1. Raw control characters inside a string value — a code snippet written with
 *    real newlines instead of `\n`. Common when a question body contains code.
 * 2. A body cut short by the token limit, leaving objects/arrays unclosed.
 *
 * Scans once, tracking whether it is inside a string, escaping any control
 * character it finds there and closing whatever is still open at the end.
 * Returns the repaired text, or null if there is no object to work from.
 */
function repairJSON(text) {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let out = "";
  let inString = false;
  let escaped = false;
  const owed = []; // closers still needed, innermost last

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
      } else if (ch === "\\") {
        out += ch;
        escaped = true;
      } else if (ch === '"') {
        out += ch;
        inString = false;
      } else {
        const code = ch.charCodeAt(0);
        if (code < 0x20) {
          // JSON forbids these unescaped inside a string.
          out +=
            ch === "\n"
              ? "\\n"
              : ch === "\r"
                ? "\\r"
                : ch === "\t"
                  ? "\\t"
                  : `\\u${code.toString(16).padStart(4, "0")}`;
        } else {
          out += ch;
        }
      }
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === "{") owed.push("}");
    else if (ch === "[") owed.push("]");
    else if (ch === "}" || ch === "]") owed.pop();
    out += ch;
  }

  // Truncation: close the open string, drop any half-written trailing key or
  // separator, then close the structures that are still open.
  if (inString) out += '"';
  if (owed.length) {
    out = out.replace(/,\s*"[^"]*"?\s*:?\s*$/, "").replace(/[,:]\s*$/, "");
    while (owed.length) out += owed.pop();
  }

  return out;
}

function safeParseJSON(raw) {
  if (!raw) return null;
  let text = String(raw).trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  try {
    return JSON.parse(text);
  } catch {
    // Reasoning models sometimes emit their scratchpad ahead of the answer. Only
    // stripped here, in the failure path, so valid JSON that happens to contain
    // the literal "<think>" in a string value is never touched.
    const withoutReasoning = text
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/^[\s\S]*?<\/think>/i, "")
      .trim();
    if (withoutReasoning && withoutReasoning !== text) {
      try { return JSON.parse(withoutReasoning); } catch { /* keep going */ }
      text = withoutReasoning;
    }

    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through to repair */ }
    }
    // Last resort: a partial result beats no result, and every caller
    // validates the fields it needs anyway.
    const repaired = repairJSON(text);
    if (repaired) {
      try { return JSON.parse(repaired); } catch { return null; }
    }
    return null;
  }
}

module.exports = {
  normalize,
  similarityRatio,
  isRepeatedAnswer,
  isDuplicateQuestion,
  safeParseJSON,
  repairJSON,
};
