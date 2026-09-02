/* Language switcher — applies translations from js/i18n-data.js (which
   must load first and define window.I18N = { en: {...}, ru: {...}, es: {...} }).

   Markup conventions:
     data-i18n="key"            sets the element's textContent
     data-i18n-html="key"       sets innerHTML instead (only for entries that need inline tags like <br>)
     data-i18n-<attr>="key"     sets that attribute instead (e.g. data-i18n-title, data-i18n-placeholder, data-i18n-aria-label, data-i18n-content)
   An element can combine one content key (data-i18n / data-i18n-html) with any number of attribute keys.
*/
var I18N_STORAGE_KEY = "eks-lang";
var I18N_DEFAULT = "en";
var I18N_SUPPORTED = ["en", "ru", "es"];

function i18nGet(lang, key) {
  var dict = (window.I18N && window.I18N[lang]) || {};
  if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
  var fallback = (window.I18N && window.I18N[I18N_DEFAULT]) || {};
  return Object.prototype.hasOwnProperty.call(fallback, key) ? fallback[key] : null;
}

function i18nApply(lang) {
  document.documentElement.setAttribute("lang", lang);

  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    var value = i18nGet(lang, el.getAttribute("data-i18n"));
    if (value !== null) el.textContent = value;
  });

  document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
    var value = i18nGet(lang, el.getAttribute("data-i18n-html"));
    if (value !== null) el.innerHTML = value;
  });

  Array.prototype.slice.call(document.querySelectorAll("*")).forEach(function (el) {
    for (var i = 0; i < el.attributes.length; i++) {
      var attr = el.attributes[i];
      if (attr.name.indexOf("data-i18n-") !== 0) continue;
      var targetAttr = attr.name.slice("data-i18n-".length);
      if (targetAttr === "html") continue; /* handled above */
      var value = i18nGet(lang, attr.value);
      if (value !== null) el.setAttribute(targetAttr, value);
    }
  });

  document.querySelectorAll("[data-lang-switch] [data-lang]").forEach(function (btn) {
    btn.classList.toggle("is-active", btn.getAttribute("data-lang") === lang);
  });

  document.dispatchEvent(new CustomEvent("i18nchange", { detail: { lang: lang } }));
}

function i18nSetLang(lang) {
  if (I18N_SUPPORTED.indexOf(lang) === -1) lang = I18N_DEFAULT;
  try {
    localStorage.setItem(I18N_STORAGE_KEY, lang);
  } catch (e) {
    /* ignore */
  }
  i18nApply(lang);
}

function i18nCurrentLang() {
  var saved = null;
  try {
    saved = localStorage.getItem(I18N_STORAGE_KEY);
  } catch (e) {
    /* ignore */
  }
  return I18N_SUPPORTED.indexOf(saved) !== -1 ? saved : I18N_DEFAULT;
}

i18nApply(i18nCurrentLang());

document.addEventListener("DOMContentLoaded", function () {
  i18nApply(i18nCurrentLang());

  document.querySelectorAll("[data-lang-switch] [data-lang]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      i18nSetLang(btn.getAttribute("data-lang"));
    });
  });
});
