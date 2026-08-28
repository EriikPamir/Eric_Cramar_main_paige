/* "Start a Project" form: client-side validation + submission.
   ---------------------------------------------------------------------
   No backend exists yet, so this posts to FormSubmit (formsubmit.co) —
   a free service that forwards form submissions straight to an email
   inbox, no server code required.

   TO ACTIVATE (STUDIO_EMAIL below is already set to contact@erickramar.com):
   1. Deploy the site and submit the form once for real.
   2. FormSubmit emails that address a one-time confirmation link —
      click it once and every submission after that lands in the inbox.

   To switch to a different backend later (e.g. your own API), replace
   the fetch() call in submitForm() — the validation logic above it can
   stay as-is.
   --------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", function () {
  var STUDIO_EMAIL = "contact@erickramar.com";

  var form = document.querySelector("[data-project-form]");
  if (!form) return;

  var statusEl = form.querySelector("[data-form-status]");
  var submitBtn = form.querySelector("[type='submit']");

  function setError(field, message) {
    var wrapper = field.closest(".field");
    if (!wrapper) return;
    wrapper.classList.add("has-error");
    var errorEl = wrapper.querySelector(".field-error");
    if (errorEl) errorEl.textContent = message;
  }

  function clearError(field) {
    var wrapper = field.closest(".field");
    if (!wrapper) return;
    wrapper.classList.remove("has-error");
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validate() {
    var valid = true;
    var name = form.querySelector("#field-name");
    var email = form.querySelector("#field-email");
    var need = form.querySelector("#field-need");
    var message = form.querySelector("#field-message");

    [name, email, need, message].forEach(clearError);

    if (!name.value.trim()) {
      setError(name, "Please enter your name.");
      valid = false;
    }
    if (!email.value.trim() || !isValidEmail(email.value.trim())) {
      setError(email, "Please enter a valid email address.");
      valid = false;
    }
    if (!need.value.trim()) {
      setError(need, "Let us know what you need.");
      valid = false;
    }
    if (!message.value.trim()) {
      setError(message, "Tell us a bit about your project.");
      valid = false;
    }

    return valid;
  }

  function showStatus(kind, text) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = "form-status is-visible is-" + kind;
  }

  function submitForm(formData) {
    return fetch("https://formsubmit.co/ajax/" + encodeURIComponent(STUDIO_EMAIL), {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!validate()) {
      showStatus("error", "Please fix the highlighted fields and try again.");
      return;
    }

    var formData = new FormData(form);
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    submitForm(formData)
      .then(function (response) {
        if (!response.ok) throw new Error("Request failed");
        showStatus("success", "Thanks — your project details are on their way. We'll be in touch shortly.");
        form.reset();
      })
      .catch(function () {
        showStatus(
          "error",
          "Something went wrong sending this. Please try again, or email us directly at " + STUDIO_EMAIL + "."
        );
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Project";
      });
  });
});
