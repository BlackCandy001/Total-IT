// Configure Chrome side panel to open on action (icon) click
if (typeof chrome !== 'undefined' && chrome.sidePanel) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Error setting side panel behavior:', error));
} else if (typeof browser !== 'undefined' && browser.action && browser.sidebarAction) {
  // Fallback for Firefox if users click the action icon
  browser.action.onClicked.addListener(() => {
    browser.sidebarAction.open();
  });
}
