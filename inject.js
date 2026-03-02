(function() {
  try {
    // Priority 1: GLOBALS[9]
    if (window.GLOBALS && Array.isArray(window.GLOBALS) && window.GLOBALS[9]) {
      document.body.setAttribute('data-ik', window.GLOBALS[9]);
      return;
    }

    // Priority 2: _GM_setData
    // This is harder to snatch from window, but often GLOBALS covers it
  } catch (e) {
    console.warn("Tính Điểm IT: Secondary injection error", e);
  }
})();
