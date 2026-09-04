/* Applies admin-set price/name overrides from data/pricing.json on top of
   the static defaults already in the markup. If the file is missing or a
   plan/field isn't set, the static text in index.html is left untouched. */
document.addEventListener("DOMContentLoaded", function () {
  fetch("data/pricing.json", { cache: "no-store" })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      if (!data) return;
      Object.keys(data).forEach(function (planKey) {
        var card = document.querySelector('[data-pricing-plan="' + planKey + '"]');
        if (!card) return;
        var plan = data[planKey] || {};
        if (plan.name) {
          var nameEl = card.querySelector("[data-plan-name]");
          if (nameEl) nameEl.textContent = plan.name;
        }
        if (plan.price) {
          var priceEl = card.querySelector("[data-price-value]");
          if (priceEl) priceEl.textContent = plan.price;
        }
      });
    })
    .catch(function () { /* keep static defaults */ });
});
