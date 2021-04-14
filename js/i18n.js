
// 非 vue 实例的国际化处理 data-i18n="key"
document.querySelectorAll('[data-i18n]').forEach(function(el) {
  el.textContent = chrome.i18n.getMessage(el.dataset.i18n) || el.dataset.i18n || el.textContent;
});

// vue 国际化指令
if (typeof Vue !== 'undefined') {
  Vue.directive('i18n', function(el, binding) {
    el.textContent = chrome.i18n.getMessage(binding.value) || binding.value || el.textContent;
  });
}
