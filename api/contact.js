const requestTimesByIp = new Map();
const maxRequests = 5;
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
  if (requestTimesByIp.size >= maxTrackedIps && !requestTimesByIp.has(ip)) return true;

  recent.push(now);
  requestTimesByIp.set(ip, recent);
  return false;
}

function validEmail(value) {
  return typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sendEmail({ apiKey, from, to, replyTo, subject, text }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      text
    }),
    signal: AbortSignal.timeout(8_000)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Email provider rejected message:", response.status, errorBody.slice(0, 500));
    return false;
  }
  return true;
}

function requiredText(data, field, maxLength) {
  return typeof data[field] === "string" && data[field].trim().length > 0 &&
    data[field].trim().length <= maxLength;
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
    console.error("Contact email is not configured. Set SITE_URL, RESEND_API_KEY, EMAIL_FROM, and NOTIFICATION_EMAIL.");
    return sendJson(response, 503, { error: "The contact form is temporarily unavailable. Please try again later." });
  }

  let expectedOrigin;
  try {
    expectedOrigin = new URL(siteUrl).origin;
  } catch {
    console.error("SITE_URL must be a valid absolute URL.");
    return sendJson(response, 503, { error: "The contact form is temporarily unavailable. Please try again later." });
  }

  if (request.headers.origin !== expectedOrigin) {
    return sendJson(response, 403, { error: "This request could not be verified." });
  }

  const forwardedFor = request.headers["x-forwarded-for"];
  const ip = request.headers["x-real-ip"] ||
    (typeof forwardedFor === "string" ? forwardedFor.split(",")[0].trim() : request.socket?.remoteAddress);
  if (typeof ip !== "string" || !ip) {
    return sendJson(response, 400, { error: "Unable to verify this request. Please try again." });
  }
  if (isRateLimited(ip)) {
    return sendJson(response, 429, { error: "Too many requests. Please try again in a few minutes." });
  }

  const data = request.body;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return sendJson(response, 400, { error: "Invalid contact request." });
  }
  if (typeof data.website === "string" && data.website.trim()) {
    return sendJson(response, 202, { ok: true });
  }

  const type = data.type;
  const email = typeof data.email === "string" ? data.email.trim() : "";
  if (!validEmail(email) || data.consent !== true) {
    return sendJson(response, 400, { error: "Enter a valid email address and provide consent." });
  }

  if (type === "contact") {
    const requiredFields = [
      ["firstName", 80],
      ["lastName", 80],
      ["company", 120],
      ["country", 80],
      ["phone", 16],
      ["topic", 100],
      ["details", 3_000]
    ];
    if (requiredFields.some(([field, maxLength]) => !requiredText(data, field, maxLength))) {
      return sendJson(response, 400, { error: "Complete all required contact fields and try again." });
    }
    if (!/^\+[1-9]\d{6,14}$/.test(data.phone)) {
      return sendJson(response, 400, { error: "Enter a valid international phone number." });
    }

    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();
    const company = data.company.trim();
    const country = data.country.trim();
    const phone = data.phone;
    const topic = data.topic.trim();
    const details = data.details.trim();
    const message = [
      "New Avistech website contact enquiry",
      "",
      `Name: ${firstName} ${lastName}`,
      `Email: ${email}`,
      `Company: ${company}`,
      `Country: ${country}`,
      `Phone: ${phone}`,
      `Topic: ${topic}`,
      "",
      "Details:",
      details
    ].join("\n");

    try {
      const [notificationSent, confirmationSent] = await Promise.all([
        sendEmail({
          apiKey: resendApiKey,
          from: emailFrom,
          to: notificationEmail,
          replyTo: email,
          subject: `Avistech enquiry: ${topic}`,
          text: message
        }),
        sendEmail({
          apiKey: resendApiKey,
          from: emailFrom,
          to: email,
          replyTo: notificationEmail,
          subject: "Avistech received your enquiry",
          text: [
            `Hello ${firstName},`,
            "",
            "Thanks for contacting Avistech. We received your enquiry and will review it.",
            "",
            `Topic: ${topic}`,
            "",
            "FlightOps is in development. Your enquiry does not create an account or provide access to an operational service.",
            "",
            "Avistech"
          ].join("\n")
        })
      ]);
      if (!notificationSent) {
        return sendJson(response, 502, { error: "We couldn't deliver your enquiry. Please try again later." });
      }
      if (!confirmationSent) {
        console.error("Avistech received the enquiry but could not send the contact confirmation.");
        return sendJson(response, 202, { ok: true, confirmation: false });
      }
    } catch (error) {
      console.error("Unable to deliver contact enquiry:", error);
      return sendJson(response, 502, { error: "We couldn't deliver your enquiry. Please try again later." });
    }

    return sendJson(response, 202, { ok: true, confirmation: true });
  }

  return sendJson(response, 400, { error: "Unsupported contact request." });
};

module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: "8kb"
    }
  }
};
