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

const signupForm = document.querySelector("#early-access-form");

if (signupForm instanceof HTMLFormElement) {
  const status = document.querySelector("#signup-status");
  const submitButton = signupForm.querySelector('button[type="submit"]');

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!status || !(submitButton instanceof HTMLButtonElement)) {
      console.error("The early-access form status or submit button is missing.");
      return;
    }

    const formData = new FormData(signupForm);
    const email = formData.get("email");
    if (typeof email !== "string" || formData.get("consent") !== "on") {
      status.textContent = "Enter a valid email address and agree to receive launch updates.";
      return;
    }

    status.textContent = "Sending your request…";
    submitButton.disabled = true;

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          consent: true,
          website: formData.get("website")
        }),
        signal: AbortSignal.timeout(12_000)
      });
      const result = await response.json();
      if (!response.ok) {
        status.textContent = typeof result.error === "string"
          ? result.error
          : "We couldn't submit your request. Please try again.";
        return;
      }

      status.textContent = "Request received. Check your inbox for a confirmation from Avistech.";
      signupForm.reset();
    } catch (error) {
      console.error("Unable to submit early-access request:", error);
      status.textContent = "We couldn't reach the signup service. Please try again shortly.";
    } finally {
      submitButton.disabled = false;
    }
  });
}
