/**
 * The project's single Groq integration.
 *
 * Previously each feature constructed its own client and its own JSON-asking
 * wrapper; this is that code, extracted so resume analysis, the interview
 * engine and the readiness engine all share one model choice and one failure
 * policy.
 */

const Groq = require("groq-sdk");
const { safeParseJSON } = require("./textUtils");

// Constructed on first use, not at import time: the SDK throws when
// GROQ_API_KEY is unset, which would otherwise take the whole server down at
// boot instead of failing the one request that needs it.
let groqClient = null;
function getGroq() {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

/**
 * Models are tried in order. Every model has its OWN daily token budget, so a
 * chain is what stops one exhausted budget from taking the whole feature down.
 *
 * Deliberately no `groq/compound*` here. Compound models are agentic: they
 * prepend a large tool-use scaffold to every request, which measured at ~3300
 * prompt tokens for a 40-token prompt — roughly a hundred times the overhead of
 * a plain model for output we never use the agentic behaviour to produce. They
 * also share one budget across the whole compound family.
 *
 * Chain order is by measured reliability on this project's prompts: strict
 * JSON, all questions well-formed, no reasoning text leaking into the reply.
 */
const DEFAULT_MODEL_CHAIN = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
];

const parseModelList = (value) =>
  String(value || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

/**
 * GROQ_MODEL overrides the primary model; GROQ_MODEL_FALLBACKS replaces the
 * rest of the chain. Both optional — the defaults above are the tested path.
 */
function buildChain() {
  const primary = parseModelList(process.env.GROQ_MODEL);
  const fallbacks = parseModelList(process.env.GROQ_MODEL_FALLBACKS);
  const chain = [
    ...primary,
    ...(fallbacks.length ? fallbacks : DEFAULT_MODEL_CHAIN),
  ];
  return [...new Set(chain)];
}

const MODEL_CHAIN = buildChain();
// Kept for callers that only care which model is nominally in use.
const MODEL = MODEL_CHAIN[0];

// Retries are per model. Beyond a couple of attempts we are better off moving
// to the next model than burning more of this one's budget on the same wall.
const MAX_ATTEMPTS_PER_MODEL = 2;
const MAX_RETRY_WAIT_MS = 6000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Models that rejected `response_format: json_object`. Populated at runtime so
 * an operator can point GROQ_MODEL at anything without having to know whether
 * it supports JSON mode — we find out once and remember.
 */
const noJsonMode = new Set();

// ── Error classification ───────────────────────────────────

const message = (err) => err?.message || "";

/**
 * A per-day cap will not clear inside this request, so retrying the same model
 * is pointless — the next model has its own budget and is the better move.
 */
const isDailyQuota = (err) =>
  err?.status === 429 && /per day|\bTPD\b|\bRPD\b/i.test(message(err));

const isTransient = (err) =>
  (err?.status === 429 && !isDailyQuota(err)) ||
  (err?.status >= 500 && err?.status < 600) ||
  err?.code === "ECONNRESET" ||
  err?.code === "ETIMEDOUT" ||
  err?.code === "ENOTFOUND";

/** A model that cannot honour JSON mode, as opposed to a bad prompt. */
const isJsonModeUnsupported = (err) =>
  err?.status === 400 &&
  /json[_ ]?(object|mode|schema)|response_format|failed to validate json/i.test(
    message(err),
  );

/** A model name the account cannot use — skip it, do not retry it. */
const isModelUnavailable = (err) =>
  (err?.status === 404 || err?.status === 400) &&
  /model|decommissioned|does not exist|not found/i.test(message(err));

/**
 * Groq states the wait inside the 429 body, in forms like "1.5s", "500ms",
 * "27m3s" and "4m39.072s". Returns milliseconds, or null when absent.
 */
function parseRetryAfter(err) {
  const text = message(err);
  const stated = /try again in ([0-9hms.]+)/i.exec(text);
  if (!stated) return null;

  const spec = stated[1];
  let total = 0;
  let matched = false;
  // Order matters: check ms before s so "500ms" is not read as "500s".
  const units = [
    [/([\d.]+)ms/g, 1],
    [/([\d.]+)h/g, 3600000],
    [/([\d.]+)m(?!s)/g, 60000],
    [/([\d.]+)s/g, 1000],
  ];
  let rest = spec;
  for (const [pattern, factor] of units) {
    rest = rest.replace(pattern, (_, n) => {
      const value = Number(n);
      if (Number.isFinite(value)) {
        total += value * factor;
        matched = true;
      }
      return "";
    });
  }
  return matched && total > 0 ? Math.ceil(total) : null;
}

/** How long to wait before retrying the same model. */
function retryDelay(err, attempt) {
  const stated = parseRetryAfter(err);
  // Only worth honouring if it is short; a long wait means move on instead.
  if (stated && stated <= MAX_RETRY_WAIT_MS) return stated + 250;
  return Math.min(500 * 2 ** attempt, MAX_RETRY_WAIT_MS);
}

/**
 * The error callers see once every model has been tried. Carries a real status
 * so the API returns 429/503 rather than a blanket 500, and a retry hint so the
 * UI can say when to come back instead of just "unavailable".
 */
function exhaustedError(lastError, tried) {
  const quota = isDailyQuota(lastError);
  const busy = lastError?.status === 429;

  const err = new Error(
    quota
      ? "The AI service has used up today's quota on this account. It will reset automatically — please try again later."
      : busy
        ? "The AI service is busy right now. Please try again in a moment."
        : "The AI service is temporarily unavailable. Please try again in a moment.",
  );
  err.status = busy ? 429 : 503;
  err.aiFailure = quota ? "quota" : busy ? "rate-limit" : "unavailable";
  err.modelsTried = tried;
  err.cause = lastError;

  const wait = parseRetryAfter(lastError);
  if (wait) err.retryAfterSeconds = Math.ceil(wait / 1000);

  return err;
}

// ── Completion ─────────────────────────────────────────────

/**
 * One chat completion, tried across the model chain.
 *
 * Within a model: retry only genuinely transient failures. Across models: move
 * on for anything that will not clear on its own (daily quota, an unusable
 * model name). Throws `exhaustedError` when nothing worked.
 */
async function createCompletion({ system, user, temperature, maxTokens }) {
  let lastError;
  const tried = [];

  for (const model of MODEL_CHAIN) {
    tried.push(model);

    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt++) {
      const useJsonMode = !noJsonMode.has(model);
      try {
        return await getGroq().chat.completions.create({
          model,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            { role: "user", content: user },
          ],
          temperature,
          max_tokens: maxTokens,
          // Guarantees a syntactically valid object where supported, which
          // removes most of the reason the parse fallbacks exist.
          ...(useJsonMode ? { response_format: { type: "json_object" } } : {}),
        });
      } catch (err) {
        lastError = err;

        // Learn once, per process, that this model cannot do JSON mode.
        if (useJsonMode && isJsonModeUnsupported(err)) {
          noJsonMode.add(model);
          console.warn(`${model}: JSON mode unsupported, retrying without it`);
          continue;
        }

        if (isDailyQuota(err)) {
          console.warn(
            `${model}: daily token quota exhausted, falling back to the next model`,
          );
          break;
        }

        if (isModelUnavailable(err)) {
          console.warn(`${model}: unavailable on this account (${err.status})`);
          break;
        }

        if (!isTransient(err) || attempt === MAX_ATTEMPTS_PER_MODEL - 1) break;

        const wait = retryDelay(err, attempt);
        console.warn(
          `${model}: ${err.status || err.code} on attempt ${attempt + 1}/${MAX_ATTEMPTS_PER_MODEL}; retrying in ${wait}ms`,
        );
        await sleep(wait);
      }
    }
  }

  const failure = exhaustedError(lastError, tried);
  console.error(
    `All models failed (${tried.join(" -> ")}): ${message(lastError)}`,
  );
  throw failure;
}

/**
 * Pull the JSON body out of a completion, logging why it failed when it does —
 * a truncated reply and a refusal look identical to the caller otherwise.
 */
function parseCompletion(completion, label) {
  const choice = completion.choices?.[0];
  const raw = choice?.message?.content;
  const parsed = safeParseJSON(raw);

  if (!parsed) {
    console.error(
      `${label}: could not parse ${completion.model}'s reply ` +
        `(finish_reason=${choice?.finish_reason}, ` +
        `completion_tokens=${completion.usage?.completion_tokens}, chars=${raw?.length ?? 0})`,
    );
  }
  return { parsed, raw };
}

/**
 * Ask the model for JSON. Returns parsed JSON, or null on any failure
 * (network, rate limit, unparseable body) so callers can degrade gracefully
 * instead of throwing mid-request.
 */
async function askForJSON({ system, user, temperature = 0.6, maxTokens = 700 }) {
  try {
    const completion = await createCompletion({
      system,
      user,
      temperature,
      maxTokens,
    });
    return parseCompletion(completion, "askForJSON").parsed;
  } catch (err) {
    console.error("Groq call failed:", err.message);
    return null;
  }
}

/**
 * Same call, but the caller needs to distinguish "the AI is unreachable" from
 * "the AI replied with nonsense" — used where a hard error is the right answer
 * rather than a fallback. Throws `exhaustedError` in the former case.
 */
async function askForJSONStrict({
  system,
  user,
  temperature = 0.6,
  maxTokens = 700,
}) {
  const completion = await createCompletion({
    system,
    user,
    temperature,
    maxTokens,
  });
  return parseCompletion(completion, "askForJSONStrict");
}

module.exports = {
  getGroq,
  MODEL,
  MODEL_CHAIN,
  askForJSON,
  askForJSONStrict,
};
