/**
 * Sending errors that already know their own status.
 *
 * The AI layer classifies its failures and attaches a status (429 when rate
 * limited, 503 when unreachable) plus, when Groq stated one, how long to wait.
 * Passing that wait through as a `Retry-After` header is the difference between
 * a client that backs off and one that retries straight into the same wall.
 */
function sendKnownError(res, error) {
  const retryAfterSeconds = Number(error.retryAfterSeconds);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    res.set("Retry-After", String(Math.ceil(retryAfterSeconds)));
    return res
      .status(error.status)
      .json({ error: error.message, retryAfterSeconds: Math.ceil(retryAfterSeconds) });
  }
  return res.status(error.status).json({ error: error.message });
}

module.exports = { sendKnownError };
