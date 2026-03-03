// Cấu hình Side Panel của Chrome để tự động mở khi nhấn vào biểu tượng extension
if (typeof chrome !== 'undefined' && chrome.sidePanel) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Lỗi khi thiết lập hành vi side panel:', error));
} else if (typeof browser !== 'undefined' && browser.action && browser.sidebarAction) {
  // Phương án dự phòng cho Firefox khi người dùng nhấn vào biểu tượng
  browser.action.onClicked.addListener(() => {
    browser.sidebarAction.open();
  });
}
