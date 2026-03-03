(function() {
  try {
    // Ưu tiên 1: GLOBALS[9]
    if (window.GLOBALS && Array.isArray(window.GLOBALS) && window.GLOBALS[9]) {
      document.body.setAttribute('data-ik', window.GLOBALS[9]);
      return;
    }

    // Ưu tiên 2: _GM_setData
    // Việc lấy dữ liệu này từ window khó hơn, nhưng thường GLOBALS đã bao quát được
  } catch (e) {
    console.warn("Tính Điểm IT: Lỗi tiêm script phụ", e);
  }
})();
