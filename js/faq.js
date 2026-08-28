/* FAQ accordion — click a question to expand its answer. */
document.addEventListener("DOMContentLoaded", function () {
  var items = document.querySelectorAll(".accordion-item");

  items.forEach(function (item) {
    var trigger = item.querySelector(".accordion-trigger");
    var panel = item.querySelector(".accordion-panel");
    if (!trigger || !panel) return;

    trigger.addEventListener("click", function () {
      var isOpen = item.classList.contains("is-open");

      /* Close any other open item so only one answer shows at a time */
      items.forEach(function (other) {
        if (other === item) return;
        other.classList.remove("is-open");
        var otherPanel = other.querySelector(".accordion-panel");
        if (otherPanel) otherPanel.style.maxHeight = null;
        var otherTrigger = other.querySelector(".accordion-trigger");
        if (otherTrigger) otherTrigger.setAttribute("aria-expanded", "false");
      });

      if (isOpen) {
        item.classList.remove("is-open");
        panel.style.maxHeight = null;
        trigger.setAttribute("aria-expanded", "false");
      } else {
        item.classList.add("is-open");
        panel.style.maxHeight = panel.scrollHeight + "px";
        trigger.setAttribute("aria-expanded", "true");
      }
    });
  });
});
