# Avistech FlightOps

Responsive corporate/product website for Avistech's FlightOps product, which is in development for commercial drone operators and flight schools.

## Pages

- `index.html`: company and product overview.
- `products.html`: product capability carousel with 3D motion.
- `solutions.html`: commercial operator, flight school, and fleet-maintenance use cases.
- `why-avistech.html`: product principles.
- `about.html`: who Avistech is and current product status.
- `pricing.html`: planned $29, $79, and $249 monthly tiers; subscriptions are not available yet.
- `workspace.html`: visual workspace layout with explicitly fictional sample records.
- `faq.html`: product, pricing, availability, and data-handling answers.
- `contact.html`: contact form with name, company, email, calling-code selector, phone number, enquiry topic, and details.
- `privacy.html` and `terms.html`: current website and availability notices.

## Deploy to Vercel

Set the Vercel project root to this directory. Static pages are served directly and `api/contact.js` handles contact form submissions.

Configure these environment variables in **Vercel → Project → Settings → Environment Variables**:

| Variable | Example | Purpose |
| --- | --- | --- |
| `SITE_URL` | `https://avistech.space` | Canonical website origin used to validate contact requests. |
| `RESEND_API_KEY` | `re_...` | Private server-side API key from Resend. Never expose it in browser code. |
| `EMAIL_FROM` | `Avistech <no-reply@avistech.space>` | Sender identity on the verified sending domain. |
| `NOTIFICATION_EMAIL` | `contactus@avistech.space` | Avistech inbox that receives contact enquiries. |

### Verify email delivery

1. Add `avistech.space` or a dedicated sending subdomain to Resend and publish the DNS records Resend supplies.
2. Keep existing Zoho MX records. Merge SPF authorization if needed; do not create multiple SPF records for the same host.
3. Verify the sending domain and use `Avistech <no-reply@avistech.space>` for `EMAIL_FROM`. A no-reply sender does not need to be an inbox; contact replies go to the visitor and Avistech receives the enquiry separately.
4. Add the environment variables in Vercel and redeploy.
5. Test the form with a real submission. Confirm the enquiry reaches `contactus@avistech.space` and the acknowledgement reaches the address entered in the form.
6. Review SPF/DKIM alignment and configure a DMARC policy for the domain.

The contact API sends one enquiry email to Avistech and a separate acknowledgement to the visitor. It does not save form submissions in an application database. Treat the received notification email as the current enquiry record. The API includes a honeypot and basic in-memory rate limiting; add a durable rate-limit/bot-protection service and decide retention/deletion procedures before high-volume use.

The selected calling code is applied in the browser to produce the submitted international phone number. The API validates the resulting E.164-style number format.

## Motion and accessibility

Product cards use CSS perspective and a small pointer-based tilt; the product page has clickable feature slides and background transitions. Scroll/page transitions honor `prefers-reduced-motion`.

## Product accuracy

FlightOps is still in development. Workspace visuals use fictional sample information; plans and prices are not yet purchasable. Keep these availability statements until the service is actually operational. A website does not establish AWS Activate eligibility or guarantee program approval.
