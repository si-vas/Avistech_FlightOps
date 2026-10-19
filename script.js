const menuButton = document.querySelector(".menu-toggle");
const navLinks = document.querySelector("#nav-links");

if (menuButton && navLinks) {
  const menuLabel = menuButton.querySelector(".sr-only");

  menuButton.addEventListener("click", () => {
    const isExpanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isExpanded));
    menuLabel.textContent = isExpanded ? "Open navigation" : "Close navigation";
    navLinks.classList.toggle("is-open", !isExpanded);
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      menuButton.setAttribute("aria-expanded", "false");
      menuLabel.textContent = "Open navigation";
      navLinks.classList.remove("is-open");
    }
  });
}

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

const countrySelect = document.querySelector("#country-code");

function getCountrySelection() {
  if (!(countrySelect instanceof HTMLSelectElement)) return null;
  const [country, dialCode = ""] = countrySelect.value.split("|");
  const selectedOption = countrySelect.selectedOptions[0];
  return { country, dialCode, name: selectedOption?.textContent?.trim() || country };
}

const contactForm = document.querySelector("#contact-form");

if (contactForm instanceof HTMLFormElement) {
  const status = document.querySelector("#contact-status");
  const successDialog = document.querySelector("#contact-success");
  const successMessage = document.querySelector("#contact-success-message");
  const closeDialogButtons = successDialog?.querySelectorAll(".success-dialog-close, .success-dialog-button");
  const submitButton = contactForm.querySelector('button[type="submit"]');
  const topicSelect = document.querySelector("#contact-topic");
  closeDialogButtons?.forEach((button) => {
    button.addEventListener("click", () => {
      if (successDialog instanceof HTMLDialogElement) successDialog.close();
    });
  });
  const requestedInterest = new URLSearchParams(window.location.search).get("interest");
  if (topicSelect instanceof HTMLSelectElement && requestedInterest) {
    const normalizedInterest = requestedInterest.toLowerCase();
    const matchingOption = [...topicSelect.options].find((option) =>
      option.textContent.toLowerCase().includes(normalizedInterest)
    );
    if (matchingOption) topicSelect.value = matchingOption.value;
  }

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!status || !(submitButton instanceof HTMLButtonElement)) {
      console.error("The contact form status or submit button is missing.");
      return;
    }

    const formData = new FormData(contactForm);
    const selection = getCountrySelection();
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const email = formData.get("email");
    const company = formData.get("company");
    const phone = formData.get("phone");
    const topic = formData.get("topic");
    const details = formData.get("details");

    if (
      !selection ||
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof email !== "string" ||
      typeof company !== "string" ||
      typeof phone !== "string" ||
      typeof topic !== "string" ||
      typeof details !== "string" ||
      formData.get("consent") !== "on"
    ) {
      status.textContent = "Complete the required fields and consent before sending your enquiry.";
      return;
    }

    const submittedEmail = email.trim();
    const phoneDigits = phone.replace(/\D/g, "");
    const phoneE164 = selection.dialCode
      ? `${selection.dialCode}${phoneDigits.replace(/^0+/, "")}`
      : `+${phone.replace(/[\s().-]/g, "").replace(/^\+/, "")}`;
    if (!/^\+[1-9]\d{6,14}$/.test(phoneE164)) {
      status.textContent = "Enter a valid phone number for the selected country.";
      return;
    }

    status.textContent = "Sending your request…";
    submitButton.disabled = true;

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "contact",
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: submittedEmail,
          company: company.trim(),
          country: selection.name,
          countryCode: selection.dialCode,
          phone: phoneE164,
          topic: topic.trim(),
          details: details.trim(),
          consent: formData.get("consent") === "on",
          website: formData.get("website")
        }),
        signal: AbortSignal.timeout(12_000)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        status.textContent = typeof result.error === "string"
          ? result.error
          : "We couldn't confirm your request was submitted. Please try again or email contactus@avistech.space.";
        return;
      }

      const confirmationMessage = result.confirmation === false
        ? `Thanks, ${firstName.trim()}. We received your request. Our team will get in touch at ${submittedEmail}; an automated confirmation could not be sent.`
        : `Thanks, ${firstName.trim()}. Our team will get in touch shortly at ${submittedEmail}. A confirmation email is on its way.`;
      if (successDialog instanceof HTMLDialogElement && successMessage instanceof HTMLElement) {
        successMessage.textContent = confirmationMessage;
        successDialog.showModal();
      } else {
        status.textContent = confirmationMessage;
      }
      contactForm.reset();
      if (topicSelect instanceof HTMLSelectElement && requestedInterest) {
        const normalizedInterest = requestedInterest.toLowerCase();
        const matchingOption = [...topicSelect.options].find((option) =>
          option.textContent.toLowerCase().includes(normalizedInterest)
        );
        if (matchingOption) topicSelect.value = matchingOption.value;
      }
    } catch (error) {
      console.error("Unable to submit contact enquiry:", error);
      status.textContent = "We couldn't reach the contact service. Please try again shortly.";
    } finally {
      submitButton.disabled = false;
    }
  });
}

const slides = [
  {
    title: "Flight records with context.",
    description: "Capture the flight details a team wants to find later: aircraft, pilot, date, duration, and notes.",
    heading: "Flight log",
    task: "Flight recorded",
    detail: "Sample record · fictional data"
  },
  {
    title: "Maintenance in the same view.",
    description: "Keep service history and planned intervals alongside the aircraft and activity they relate to.",
    heading: "Service schedule",
    task: "Service interval",
    detail: "Illustrative reminder · fictional data"
  },
  {
    title: "A fleet view built for decisions.",
    description: "Bring the operational context together so teams can review activity and coordinate their next steps.",
    heading: "Fleet overview",
    task: "Team summary",
    detail: "Planned capability · not connected"
  }
];

const showcase = document.querySelector("#product-showcase");
const showcaseScene = document.querySelector("#showcase-scene");

if (showcase instanceof HTMLElement && showcaseScene instanceof HTMLElement) {
  const slideButtons = [...showcase.querySelectorAll("[data-slide]")];
  const slideCount = showcase.querySelector("#slide-count");
  const title = showcase.querySelector("#slide-title");
  const description = showcase.querySelector("#slide-description");
  const sceneHeading = showcase.querySelector("#scene-heading");
  const taskTitle = showcase.querySelector("#scene-task-title");
  const taskText = showcase.querySelector("#scene-task-text");

  function showSlide(index) {
    const slide = slides[index];
    if (!slide || !slideCount || !title || !description || !sceneHeading || !taskTitle || !taskText) return;
    showcaseScene.dataset.slide = String(index);
    slideCount.textContent = `${String(index + 1).padStart(2, "0")} / 03 · PLANNED CAPABILITY`;
    title.textContent = slide.title;
    description.textContent = slide.description;
    sceneHeading.textContent = slide.heading;
    taskTitle.textContent = slide.task;
    taskText.textContent = slide.detail;
    slideButtons.forEach((button, buttonIndex) => {
      button.setAttribute("aria-pressed", String(buttonIndex === index));
    });
  }

  slideButtons.forEach((button) => {
    button.addEventListener("click", () => showSlide(Number(button.dataset.slide)));
  });
  showcase.querySelector(".slide-next")?.addEventListener("click", () => {
    const currentSlide = Number(showcaseScene.dataset.slide || "0");
    showSlide((currentSlide + 1) % slides.length);
  });

  showcaseScene.addEventListener("pointermove", (event) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || event.pointerType === "touch") return;
    const bounds = showcaseScene.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    showcaseScene.style.setProperty("--tilt-x", `${(-y * 6).toFixed(2)}deg`);
    showcaseScene.style.setProperty("--tilt-y", `${(x * 8).toFixed(2)}deg`);
  });
  showcaseScene.addEventListener("pointerleave", () => {
    showcaseScene.style.setProperty("--tilt-x", "0deg");
    showcaseScene.style.setProperty("--tilt-y", "0deg");
  });
}

if ("IntersectionObserver" in window) {
  const motionObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(
    ".section, .feature-card, .solution-card, .faq-category, .product-modules article, .why-principles article, .about-story-card, .plan-card, .contact-form"
  ).forEach((element) => {
    element.classList.add("reveal-item");
    motionObserver.observe(element);
  });
  document.documentElement.classList.add("motion-ready");
}

document.addEventListener("click", (event) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) return;

  const target = event.target;
  if (!(target instanceof Element)) return;
  const link = target.closest("a");
  if (!(link instanceof HTMLAnchorElement) || link.target || link.hasAttribute("download")) return;

  const destination = new URL(link.href, window.location.href);
  if (
    destination.origin !== window.location.origin ||
    destination.pathname === window.location.pathname ||
    destination.hash && destination.pathname === window.location.pathname
  ) return;

  event.preventDefault();
  document.body.classList.add("page-leaving");
  window.setTimeout(() => window.location.assign(destination.href), 140);
});
