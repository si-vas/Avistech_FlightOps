# Avistech FlightOps

Responsive early-access website for FlightOps, a drone flight logging and maintenance product in development.

## Pages

- `index.html`: company/product information and early-access signup.
- `workspace.html`: visual workspace preview containing fictional sample records.
- `pricing.html`: planned $29, $79, and $249 monthly tiers. The service is not yet available for purchase.
- `privacy.html`: current early-access data-handling notice.
- `terms.html`: availability and aviation-safety information.

## Deploy to Vercel

Create a Vercel project with this directory as its project root. The static HTML pages are served directly, and `api/signup.js` runs as a Vercel Function. The signup endpoint requires the environment variables below; without them, the form intentionally reports that signup is unavailable.

Set these variables in **Vercel → Project → Settings → Environment Variables** for the environments where signup should work:

| Variable | Example | Purpose |
| --- | --- | --- |
| `SITE_URL` | `https://avistech.space` | Exact canonical origin used to validate browser signup requests. |
| `RESEND_API_KEY` | `re_...` | Secret API key from Resend. Keep it server-side; never add it to HTML or browser JavaScript. |
| `EMAIL_FROM` | `Avistech <no-reply@avistech.space>` | Verified sender identity used for confirmation messages. |
| `NOTIFICATION_EMAIL` | `contactus@avistech.space` | Inbox receiving a blind copy of each signup confirmation. |

### Verify the sender domain

1. Create a Resend account and add `avistech.space` (or a dedicated sending subdomain) in its Domains dashboard.
2. Publish the exact DNS records Resend provides, then wait until the domain is verified.
3. Preserve existing Zoho MX records so `contactus@avistech.space` keeps receiving mail. If DNS requires an SPF update, merge the provider's include into the existing SPF record; do not publish multiple SPF records for one hostname.
4. Use the verified domain in `EMAIL_FROM`. `no-reply@avistech.space` does not need to be a mailbox for sending, but replies are directed to `NOTIFICATION_EMAIL`.
5. Add a DMARC policy for the domain and confirm sender alignment/inbox delivery before announcing the signup form.
6. Add the environment variables in Vercel and redeploy. Submit a real test signup and verify both the registrant confirmation and the notification at `contactus@avistech.space`.

The signup sends the registrant one confirmation email and BCCs the notification inbox. No application database is connected; the notification is the current manual record of the request. The function includes a honeypot and a basic per-instance in-memory request limit. For a public launch, add durable rate limiting or bot protection and decide how requests will be retained and removed.

## Local preview

Static pages can be previewed with any static web server. For the serverless signup endpoint, deploy a Vercel preview with the environment variables configured or use the Vercel CLI's local function emulation.

## Accuracy before publishing

FlightOps is still in development. Keep the early-access status, sample-data labels, planned-pricing wording, and availability/safety disclosures until the corresponding product features and billing are genuinely operational. Review the privacy notice against your final hosting and email-provider configuration.
