/**
 * Content script to automatically scrape exam results from Gmail for CTU students.
 */

console.log("Tính Điểm IT: Content script loaded on Gmail.");

// Inject a small script to extract 'ik' from the page context (isolated world can't see GLOBALS)
function injectIkExtractor() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

injectIkExtractor();

// Function to find and scrape exam data from the email body
function scrapeExamData() {
  const emailBodies = document.querySelectorAll('div[role="main"] .adn.ads, .ii.gt, .a3s.aiL');
  
  if (emailBodies.length === 0) return;

  emailBodies.forEach(body => {
    if (body.dataset.processed === "true") return;
    body.dataset.processed = "true";
    setTimeout(() => body.dataset.processed = "false", 5000);

    // 1. Try Table Scraper
    const tables = body.querySelectorAll('table');
    let foundInTable = false;
    tables.forEach(table => {
      const text = table.innerText.toLowerCase();
      const hasSubject = text.includes("môn thi") || text.includes("tên môn") || text.includes("học phần") || text.includes("môn học");
      const hasScore = text.includes("điểm") || text.includes("kết quả");

      if (hasSubject && hasScore) {
        processExamTable(table);
        foundInTable = true;
      }
    });

    // 2. Try List/Text Scraper (if no table found or as fallback)
    if (!foundInTable) {
      scrapeFromText(body);
    }
  });
}


function processExamTable(table) {
  const rows = Array.from(table.querySelectorAll('tr'));
  let headerRowIndex = -1;
  let headers = [];

  // Find the header row by looking for keywords
  for (let i = 0; i < rows.length; i++) {
    const cells = Array.from(rows[i].querySelectorAll('td, th')).map(c => c.innerText.trim().toLowerCase());
    if (cells.some(t => t.includes("môn") || t.includes("học phần"))) {
      headerRowIndex = i;
      headers = cells;
      break;
    }
  }

  if (headerRowIndex === -1) return;

  const dataFound = [];
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const cells = Array.from(rows[i].querySelectorAll('td, th')).map(c => c.innerText.trim());
    if (cells.length < 2) continue;

    const entry = {};
    cells.forEach((text, index) => {
      if (headers[index]) entry[headers[index]] = text;
    });

    // Flexible mapping
    const rawName = entry["môn thi"] || entry["tên môn"] || entry["tên học phần"] || entry["môn học"] || entry["môn"];
    const type = entry["loại thi"] || entry["loại"] || "";
    const attemptStr = entry["lần thi"] || entry["lần"] || "1";
    const scoreStr = entry["điểm thi"] || entry["điểm kết thúc"] || entry["điểm"] || entry["kết quả"];
    
    if (rawName && scoreStr) {
      const score = parseFloat(scoreStr.replace(',', '.'));
      const attemptRegex = /(\d+)/;
      const attemptMatch = attemptStr.match(attemptRegex);
      const attempt = attemptMatch ? parseInt(attemptMatch[1]) : 1;

      if (!isNaN(score)) {
        const finalName = type ? `${rawName} (${type})` : rawName;
        dataFound.push({
          name: finalName,
          score: score,
          attempt: isNaN(attempt) ? 1 : attempt
        });
      }
    }
  }

  if (dataFound.length > 0) {
    console.log("Tính Điểm IT: Scraped data from table:", dataFound);
    saveToStorage(dataFound);
  }
}


function showToast(message) {
  if (document.getElementById('td-it-toast')) return;

  const toast = document.createElement('div');
  toast.id = 'td-it-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #3686ff;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 10000;
    font-family: sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    pointer-events: none;
  `;
  toast.innerText = message;
  
  if (!document.getElementById('td-it-toast-style')) {
    const style = document.createElement('style');
    style.id = 'td-it-toast-style';
    style.innerHTML = `
      @keyframes slideInToast {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      #td-it-toast { animation: slideInToast 0.3s ease-out; }
    `;
    document.head.appendChild(style);
  }
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

let isScanning = false;

// Listen for commands from Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_BULK_SCAN") {
    startBulkScan();
  } else if (request.action === "STOP_SCAN") {
    isScanning = false;
    console.log("Tính Điểm IT: Stop signal received.");
  }
});

// Placeholder for resetScanButton - assuming it's defined in popup.js or similar
function resetScanButton() {
  // This function would typically send a message back to the popup to reset its UI.
  // For content script, we just log it.
  console.log("Tính Điểm IT: Resetting scan button (UI update requested).");
  chrome.runtime.sendMessage({ action: "RESET_SCAN_BUTTON" });
}

async function startBulkScan() {
  if (isScanning) return; // Prevent multiple scans
  isScanning = true;
  console.log("Tính Điểm IT: Starting Bulk Scan procedure...");
  
  const ik = getIk();
  if (!ik) {
    const errorMsg = "Không tìm thấy mã định danh Gmail (ik).\n\n" +
                   "Mẹo: Vui lòng mở một email điểm bất kỳ, đợi 1 giây rồi quay lại danh sách email và thử nhấn Quét lại. Việc này giúp Gmail tải đầy đủ thông tin cần thiết.";
    alert(errorMsg);
    chrome.runtime.sendMessage({ action: "SCAN_PROGRESS", current: 0, total: 0 });
    return;
  }

  // Improved row selection - targeting Gmail's email rows more accurately
  const emailRows = Array.from(document.querySelectorAll('tr.zA, tr[role="row"], .zA'));
  
  const examEmails = emailRows.filter(row => {
    const text = row.innerText.toLowerCase();
    return text.includes("kết quả thi") || 
           text.includes("thông báo điểm") || 
           text.includes("thông báo kết quả");
  });

  if (examEmails.length === 0) {
    alert("Không tìm thấy email điểm nào trên trang này. Vui lòng đảm bảo các email 'Kết quả thi môn...' đang hiển thị.");
    chrome.runtime.sendMessage({ action: "SCAN_PROGRESS", current: 0, total: 0 });
    return;
  }

  const total = examEmails.length;
  console.log(`Tính Điểm IT: Found ${total} target emails. Starting loop...`);
  let processedCount = 0;
  let successCount = 0;

  for (const row of examEmails) {
    let threadId = null;

    // Discovery Step 1: Standard and Modern Attributes
    const idAttrs = ['data-id', 'data-thread-id', 'data-legacy-thread-id', 'id'];
    for (const attr of idAttrs) {
        const val = row.getAttribute(attr);
        if (val && /^[a-f0-9]{16}$/.test(val)) {
            threadId = val;
            break;
        }
    }

    // Discovery Step 2: Check standard Gmail children (Checkbox, Star)
    if (!threadId) {
        const children = row.querySelectorAll('div[role="checkbox"], div[role="button"], span[data-thread-id]');
        for (const child of children) {
            for (const attrName of ['data-id', 'data-thread-id', 'data-legacy-thread-id']) {
                const val = child.getAttribute(attrName);
                if (val && /^[a-f0-9]{16}$/.test(val)) {
                    threadId = val;
                    break;
                }
            }
            if (threadId) break;
        }
    }

    // Discovery Step 3: Check all links
    if (!threadId) {
        const links = row.querySelectorAll('a');
        for (const link of links) {
            const href = link.href || "";
            // Look for 16-char hex in URL
            const matches = href.match(/[a-f0-9]{16}/);
            if (matches) {
                threadId = matches[0];
                break;
            }
        }
    }

    // Discovery Step 4: RegEx Fallback on OuterHTML
    if (!threadId) {
        const matches = row.outerHTML.match(/"([a-f0-9]{16})"/);
        if (matches) {
            threadId = matches[1];
        }
    }
    
    // Validate final ID
    const isValidId = threadId && /^[a-f0-9]{16}$/.test(threadId);
    
    if (isValidId) {
      try {
        const baseUrl = window.location.origin + window.location.pathname;
        const printUrl = `${baseUrl}?ui=2&ik=${ik}&view=pt&search=all&th=${threadId}`;
        
        console.log(`Tính Điểm IT: Processing [${processedCount + 1}/${total}] - ID: ${threadId}`);
        
        // Add timeout to fetch to prevent hanging for minutes
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        const response = await fetch(printUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        
        console.log(`Tính Điểm IT: Fetched HTML length for ${threadId}: ${html.length}`);
        
        const found = scrapeFromText(doc.body, true);
        if (found) {
            successCount++;
        } else {
            console.log(`Tính Điểm IT: Extraction failed for ${threadId}. Text content sample:`, doc.body.innerText.substring(0, 300));
            // Log full HTML to console for one failure to inspect structure
            if (successCount === 0 && processedCount === 0) {
               console.log("Tính Điểm IT: Full HTML structure for debugging:", html);
            }
        }

      } catch (error) {
        console.error(`Tính Điểm IT: Skipping entry ${threadId} due to error:`, error.message);
      }
    } else {
      console.warn("Tính Điểm IT: Skipping row - no 16-char thread ID found. Row HTML sample:", row.outerHTML.substring(0, 500));
    }
    
    processedCount++;
    chrome.runtime.sendMessage({ action: "SCAN_PROGRESS", current: processedCount, total: total });
    
    // Check if scan should stop
    if (!isScanning) {
        console.log("Tính Điểm IT: Stopping scan loop as requested.");
        break;
    }

    // Smooth delay between requests
    await new Promise(r => setTimeout(r, 800));
  }
  
  isScanning = false;
  console.log(`Tính Điểm IT: Bulk scan finished. Total: ${processedCount}, Success: ${successCount}`);
  alert(`Quét hoàn tất!\n\nĐã xử lý: ${processedCount} email.\nĐã lưu điểm: ${successCount} môn học.`);
}

function getIk() {
  // Method 1: Data attribute from injected script (Primary)
  let ik = document.body.getAttribute('data-ik');
  if (ik) return ik;

  // Method 2: URL Parameters
  const urlParams = new URLSearchParams(window.location.search);
  ik = urlParams.get('ik');
  if (ik) return ik;

  // Method 3: Search in all script tags
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    const content = script.textContent;
    if (!content) continue;
    
    // Pattern 1: Look for var GLOBALS=[..., "cf60d70744", ...] (usually index 9)
    if (content.includes("GLOBALS")) {
      const gMatch = content.match(/var\s+GLOBALS\s*=\s*\[([^\]]+)\]/);
      if (gMatch) {
         const parts = gMatch[1].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // Split by comma outside quotes
         if (parts.length > 9) {
           const val = parts[9].trim().replace(/^["']|["']$/g, '');
           if (val && /^[a-f0-9]{10}$/.test(val)) return val;
         }
      }
    }

    // Pattern 2: Look for _GM_setData used in modern "pinto" views
    if (content.includes("_GM_setData")) {
      const sdMatch = content.match(/"w43KIf"\s*:\s*\[\s*"[^"]+"\s*,\s*"[^"]+"\s*,\s*"([^"]+)"/);
      if (sdMatch) return sdMatch[1];
    }
    
    // Pattern 3: Standard ik key-value
    const match = content.match(/"ik"\s*[:]\s*"([^"]+)"/) || 
                  content.match(/'ik'\s*[:]\s*'([^']+)'/) ||
                  content.match(/["']ik["']\s*,\s*["']([^"']+)["']/) ||
                  content.match(/ik\s*[:]\s*["']([^"']+)["']/);
    
    if (match && match[1] && match[1].length >= 5) return match[1];
  }

  // Method 4: Search in all links on the page (Fallback)
  const links = document.querySelectorAll('a[href*="ik="]');
  for (const link of links) {
    const match = link.href.match(/ik=([^&]+)/);
    if (match && match[1]) return match[1];
  }

  return "";
}

function scrapeFromText(element, isBulk = false) {
  const text = element.innerText || "";
  
  // 1. Try Table Parsing (Often more reliable for CTU/University emails)
  const tables = element.querySelectorAll('table');
  for (const table of tables) {
    const rows = table.querySelectorAll('tr');
    let tableData = {};
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      if (cells.length >= 2) {
        const key = cells[0].innerText.trim();
        const val = cells[1].innerText.trim();
        tableData[key] = val;
      }
    });

    // Check if this table looks like a result table
    const nameKey = Object.keys(tableData).find(k => /Môn|Học phần|Tên/i.test(k));
    const scoreKey = Object.keys(tableData).find(k => /Điểm|Kết quả/i.test(k));
    
    // Helper to clean table values that might have swallowed entire lines
    const cleanTableValue = (val, pattern) => {
      const match = val.match(pattern);
      return match ? match[1].trim() : val.trim();
    };

    if (nameKey && scoreKey) {
      const scoreRawVal = tableData[scoreKey].toLowerCase();
      const isAbsent = /vắng\s*thi/i.test(scoreRawVal);
      const isBanned = /cấm\s*thi/i.test(scoreRawVal);

      if (isAbsent || isBanned) {
        let subjectName = tableData[nameKey];
        // Clean if it contains headers (happens in layout tables)
        const nameCleanPattern = /(?:Môn thi|Tên môn|Học phần|Môn học|Môn|Tên học phần)\s*[:\-]\s*(.+?)(?=\s*(?:Loại|Lần|Ngày|Điểm|Kết|;|[\n\r\t]|$))/i;
        if (subjectName.includes(":") || subjectName.length > 100) {
          const m = subjectName.match(nameCleanPattern);
          if (m) subjectName = m[1].trim();
          else if (subjectName.includes("Môn thi:")) {
             subjectName = subjectName.split("Môn thi:")[1].split("Loại thi:")[0].trim();
          }
        }

        const typeKey = Object.keys(tableData).find(k => /Loại|Hình thức/i.test(k));
        let type = typeKey ? tableData[typeKey] : "";
        if (type.includes(":") || type.length > 50) {
           const typePattern = /(?:Loại thi|Loại|Hình thức)\s*[:\-]\s*(.+?)(?=\s*(?:Lần|Ngày|Điểm|Kết|;|[\n\r\t]|$))/i;
           const mt = type.match(typePattern);
           if (mt) type = mt[1].trim();
        }

        const finalName = type ? `${subjectName} (${type})` : subjectName;
        const attemptKey = Object.keys(tableData).find(k => /Lần/i.test(k));
        let attempt = 1;
        if (attemptKey) {
           const attemptMatch = tableData[attemptKey].match(/(\d+)/);
           attempt = attemptMatch ? parseInt(attemptMatch[1]) : 1;
        }
        
        const statusText = isAbsent ? "Vắng" : "Cấm";
        console.log(`Tính Điểm IT: Table Match (${statusText})! ${finalName}`);
        saveToStorage([{ name: finalName, score: statusText, attempt: attempt }], isBulk);
        return true;
      }

      const scoreValue = tableData[scoreKey].replace(',', '.');
      let score;
      if (/vắng\s*thi/i.test(scoreValue)) score = "Vắng";
      else if (/cấm\s*thi/i.test(scoreValue)) score = "Cấm";
      else score = parseFloat(scoreValue);
      
      if (!isNaN(score)) {
        let subjectName = tableData[nameKey];
        const nameCleanPattern = /(?:Môn thi|Tên môn|Học phần|Môn học|Môn|Tên học phần)\s*[:\-]\s*(.+?)(?=\s*(?:Loại|Lần|Ngày|Điểm|Kết|;|[\n\r\t]|$))/i;
        if (subjectName.includes(":") || subjectName.length > 100) {
          const m = subjectName.match(nameCleanPattern);
          if (m) subjectName = m[1].trim();
        }

        const typeKey = Object.keys(tableData).find(k => /Loại|Hình thức/i.test(k));
        let type = typeKey ? tableData[typeKey] : "";
        if (type.includes(":") || type.length > 50) {
           const typePattern = /(?:Loại thi|Loại|Hình thức)\s*[:\-]\s*(.+?)(?=\s*(?:Lần|Ngày|Điểm|Kết|;|[\n\r\t]|$))/i;
           const mt = type.match(typePattern);
           if (mt) type = mt[1].trim();
        }
        
        const finalName = type ? `${subjectName} (${type})` : subjectName;
        const attemptKey = Object.keys(tableData).find(k => /Lần/i.test(k));
        let attempt = 1;
        if (attemptKey) {
           const attemptMatch = tableData[attemptKey].match(/(\d+)/);
           attempt = attemptMatch ? parseInt(attemptMatch[1]) : 1;
        }

        console.log(`Tính Điểm IT: Table Match! ${finalName}: ${score}`);
        saveToStorage([{ name: finalName, score: score, attempt: attempt }], isBulk);
        return true;
      }
    }
  }

  if (isBulk && text.length < 50) {
    console.log("Tính Điểm IT: Text too short or empty in bulk scan:", text);
  }
  
  // 2. Fallback to Regex Patterns (Optimized for CUSC)
  const patterns = {
    name: /(?:Môn thi|Tên môn|Học phần|Môn học|Môn|Tên học phần)\s*[:\-]\s*(.+?)(?=\s*(?:Loại|Lần|Ngày|Điểm|Kết|;|[\n\r\t]|$))/i,
    score: /(?:Điểm thi|Điểm kết thúc|Kết quả|Điểm|Kết quả thi)\s*[:\-]\s*([\d,.]+|vắng\s*thi|cấm\s*thi)/i,
    type: /(?:Loại thi|Loại|Hình thức)\s*[:\-]\s*(.+?)(?=\s*(?:Lần|Ngày|Điểm|Kết|;|[\n\r\t]|$))/i,
    attempt: /(?:Lần thi|Lần)\s*[:\-]\s*(\d+)/i
  };

  const nameMatch = text.match(patterns.name);
  let scoreMatch = text.match(patterns.score);
  
  // Robust fallback for 'vắng thi' or 'cấm thi' if specific labels didn't match
  if (!scoreMatch) {
      const vMatch = text.match(/vắng\s*thi/i);
      const cMatch = text.match(/cấm\s*thi/i);
      if (vMatch) scoreMatch = [vMatch[0], "vắng thi"];
      else if (cMatch) scoreMatch = [cMatch[0], "cấm thi"];
  }
  
  if (nameMatch && scoreMatch) {
    let subjectName = nameMatch[1].trim();
    let score = 0;
    const scoreRaw = scoreMatch[1].trim();

    if (scoreRaw.toLowerCase().includes("vắng thi")) {
      score = "Vắng";
    } else if (scoreRaw.toLowerCase().includes("cấm thi")) {
      score = "Cấm";
    } else {
      const scoreStr = scoreRaw.replace(',', '.');
      score = parseFloat(scoreStr);
      if (isNaN(score)) {
        console.warn("Tính Điểm IT: Score is NaN for", subjectName, scoreRaw);
        return false;
      }
    }

    const typeMatch = text.match(patterns.type);
    const type = typeMatch ? typeMatch[1].trim() : "";
    
    const attemptMatch = text.match(patterns.attempt);
    const attempt = attemptMatch ? parseInt(attemptMatch[1]) : 1;

    const finalName = type ? `${subjectName} (${type})` : subjectName;
    const data = [{ name: finalName, score: score, attempt: attempt }];

    console.log(`Tính Điểm IT: Regex Match! ${finalName}: ${score}`);
    saveToStorage(data, isBulk);
    return true;
  } else {
    if (isBulk && (text.includes("Điểm") || text.includes("Kết quả"))) {
       console.log("Tính Điểm IT: Extraction failure on text. Sample:", text.substring(0, 150));
    }
  }
  
  return false;
}

async function saveToStorage(newData, silent = false) {
  chrome.storage.local.get(['subjects', 'autoSyncEnabled'], (result) => {
    if (result.autoSyncEnabled === false && !silent) return;

    let existingSubjects = result.subjects || [];
    let updated = false;
    let addCount = 0;
    let updateCount = 0;

    newData.forEach(item => {
      // Find subject by name (case-insensitive)
      const existing = existingSubjects.find(s => s.name.toLowerCase().trim() === item.name.toLowerCase().trim());
      const attemptNum = parseInt(item.attempt) || 1;
      const gradeIndex = Math.min(Math.max(attemptNum - 1, 0), 2);
      
      if (existing) {
        if (existing.grades[gradeIndex] === null || existing.grades[gradeIndex] !== item.score) {
          existing.grades[gradeIndex] = item.score;
          existing.autoSynced = true;
          existing.syncDate = new Date().toISOString();
          updated = true;
          updateCount++;
        }
      } else {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        const grades = [null, null, null];
        grades[gradeIndex] = item.score;
        
        existingSubjects.push({
          id: id,
          name: item.name,
          grades: grades,
          autoSynced: true,
          syncDate: new Date().toISOString()
        });
        updated = true;
        addCount++;
      }
    });

    if (updated) {
      chrome.storage.local.set({ subjects: existingSubjects }, () => {
        if (!silent) showToast(`Đã cập nhật điểm cho ${newData.length} môn!`);
      });
    }
  });
}

// Observe Gmail for navigation changes (it is a Single Page App)
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(scrapeExamData, 1500);
  } else {
    // Throttled check for content changes
    if (!window._td_it_throttle) {
      window._td_it_throttle = true;
      scrapeExamData();
      setTimeout(() => window._td_it_throttle = false, 2000);
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial Trigger
window.addEventListener('load', () => setTimeout(scrapeExamData, 2000));
