const requestTimesByIp = new Map();
const maxRequests = 3;
const windowMs = 15 * 60 * 1_000;
const maxTrackedIps = 5_000;

function sendJson(response, statusCode, body) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.status(statusCode).json(body);
}

function isRateLimited(ip) {
  const now = Date.now();
  for (const [trackedIp, times] of requestTimesByIp) {
    const recent = times.filter((time) => now - time < windowMs);
    if (recent.length) requestTimesByIp.set(trackedIp, recent);
    else requestTimesByIp.delete(trackedIp);
  }

  const recent = requestTimesByIp.get(ip) || [];
  if (recent.length >= maxRequests) {
    requestTimesByIp.set(ip, recent);
    return true;
  }
  if (requestTimesByIp.size >= maxTrackedIps && !requestTimesByIp.has(ip)) {
    return true;
  }

  recent.push(now);
  requestTimesByIp.set(ip, recent);
  return false;
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { error: "Use POST to submit this form." });
  }

  if (!request.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
    return sendJson(response, 415, { error: "Submit the form using JSON." });
  }

  const siteUrl = process.env.SITE_URL;
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  if (!siteUrl || !resendApiKey || !emailFrom || !notificationEmail) {
    console.error("Early-access email is not configured. Set SITE_URL, RESEND_API_KEY, EMAIL_FROM, and NOTIFICATION_EMAIL.");
    return sendJson(response, 503, { error: "Signup is temporarily unavailable. Please try again later." });
  }

  let expectedOrigin;
  try {
    expectedOrigin = new URL(siteUrl).origin;
  } catch {
    console.error("SITE_URL must be a valid absolute URL.");
    return sendJson(response, 503, { error: "Signup is temporarily unavailable. Please try again later." });
  }

  if (request.headers.origin !== expectedOrigin) {
    return sendJson(response, 403, { error: "This signup request could not be verified." });
  }

  const forwardedFor = request.headers["x-forwarded-for"];
  const ip = typeof forwardedFor === "string"
    ? forwardedFor.split(",")[0].trim()
    : request.socket?.remoteAddress;
  if (typeof ip !== "string" || !ip) {
    return sendJson(response, 400, { error: "Unable to verify this request. Please try again." });
  }
  if (isRateLimited(ip)) {
    return sendJson(response, 429, { error: "Too many requests. Please try again in a few minutes." });
  }

  const data = request.body;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return sendJson(response, 400, { error: "Invalid signup request." });
  }

  if (typeof data.website === "string" && data.website.trim()) {
    return sendJson(response, 202, { ok: true });
  }

  const email = typeof data.email === "string" ? data.email.trim() : "";
  const validEmail = email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!validEmail || data.consent !== true) {
    return sendJson(response, 400, { error: "Enter a valid email address and agree to receive launch updates." });
  }

  let providerResponse;
  try {
    providerResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [email],
        bcc: [notificationEmail],
        reply_to: notificationEmail,
        subject: "Your Avistech FlightOps early-access request",
        text: [
          "Thanks for your interest in Avistech FlightOps.",
          "",
          "We've received your request to receive FlightOps launch updates. FlightOps is in development; this message does not create an account or provide access to an operational flight-record service.",
          "",
          "We'll email you relevant launch updates. To stop future updates, reply and ask us to remove your address.",
          "",
          "Avistech"
        ].join("\n"),
        tags: [{ name: "category", value: "early-access" }]
      }),
      signal: AbortSignal.timeout(8_000)
    });
  } catch (error) {
    console.error("Unable to reach the email provider:", error);
    return sendJson(response, 502, { error: "We couldn't send your confirmation. Please try again later." });
  }

  if (!providerResponse.ok) {
    const providerError = await providerResponse.text();
    console.error("Email provider rejected early-access request:", providerResponse.status, providerError.slice(0, 500));
    return sendJson(response, 502, { error: "We couldn't send your confirmation. Please try again later." });
  }

  return sendJson(response, 202, { ok: true });
};

module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: "8kb"
    }
  }
};
