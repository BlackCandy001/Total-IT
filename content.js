/**
 * Content script để tự động thu thập kết quả thi từ Gmail cho sinh viên.
 */

console.log("Tính Điểm IT: Content script loaded on Gmail.");

// Chèn một script nhỏ để trích xuất mã 'ik' từ ngữ cảnh trang (thế giới bị cô lập không thể thấy GLOBALS)
function injectIkExtractor() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

injectIkExtractor();

// Hàm tìm và thu thập dữ liệu thi từ nội dung email
function scrapeExamData() {
  const emailBodies = document.querySelectorAll('div[role="main"] .adn.ads, .ii.gt, .a3s.aiL');
  
  if (emailBodies.length === 0) return;

  emailBodies.forEach(body => {
    if (body.dataset.processed === "true") return;
    body.dataset.processed = "true";
    setTimeout(() => body.dataset.processed = "false", 5000);

    // 1. Thử thu thập từ bảng (Table Scraper)
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

    // 2. Thử thu thập từ danh sách/văn bản (nếu không tìm thấy bảng hoặc dùng làm phương án dự phòng)
    if (!foundInTable) {
      scrapeFromText(body);
    }
  });
}


function processExamTable(table) {
  const rows = Array.from(table.querySelectorAll('tr'));
  let headerRowIndex = -1;
  let headers = [];

  // Tìm hàng tiêu đề bằng cách tìm từ khóa
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

    // Ánh xạ linh hoạt các cột dữ liệu
    const rawName = entry["môn thi"] || entry["tên môn"] || entry["tên học phần"] || entry["môn học"] || entry["môn"];
    const type = entry["loại thi"] || entry["loại"] || "";
    const attemptStr = entry["lần thi"] || entry["lần"] || "1";
    const scoreStr = entry["điểm thi"] || entry["điểm kết thúc"] || entry["điểm"] || entry["kết quả"];
    
    if (rawName && scoreStr) {
      const scoreValue = scoreStr.replace(',', '.');
      let score;
      if (/vắng\s*thi/i.test(scoreStr)) score = "Vắng";
      else if (/cấm\s*thi/i.test(scoreStr)) score = "Cấm";
      else score = parseFloat(scoreValue);

      const attemptRegex = /(\d+)/;
      const attemptMatch = attemptStr.match(attemptRegex);
      const attempt = attemptMatch ? parseInt(attemptMatch[1]) : 1;

      if (score === "Vắng" || score === "Cấm" || !isNaN(score)) {
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
    console.log("Tính Điểm IT: Dữ liệu đã thu thập từ bảng:", dataFound);
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

// Lắng nghe lệnh từ Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_BULK_SCAN") {
    startBulkScan();
  } else if (request.action === "STOP_SCAN") {
    isScanning = false;
    console.log("Tính Điểm IT: Đã nhận tín hiệu dừng quét.");
  }
});

// Hàm đặt lại nút quét - giả định nó được định nghĩa trong popup.js hoặc tương tự
function resetScanButton() {
  // Hàm này thường gửi thông báo về popup để đặt lại giao diện người dùng.
  console.log("Tính Điểm IT: Đang đặt lại nút quét (yêu cầu cập nhật giao diện).");
  chrome.runtime.sendMessage({ action: "RESET_SCAN_BUTTON" });
}

async function startBulkScan() {
  if (isScanning) return; // Ngăn chặn việc quét nhiều lần
  isScanning = true;
  console.log("Tính Điểm IT: Bắt đầu quy trình quét hàng loạt...");
  
  const ik = getIk();
  if (!ik) {
    const errorMsg = "Không tìm thấy mã định danh Gmail (ik).\n\n" +
                   "Mẹo: Vui lòng mở một email điểm bất kỳ, đợi 1 giây rồi quay lại danh sách email và thử nhấn Quét lại. Việc này giúp Gmail tải đầy đủ thông tin cần thiết.";
    alert(errorMsg);
    chrome.runtime.sendMessage({ action: "SCAN_PROGRESS", current: 0, total: 0 });
    return;
  }

  // Cải thiện việc chọn hàng - nhắm mục tiêu chính xác hơn vào các hàng email của Gmail
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
  console.log(`Tính Điểm IT: Tìm thấy ${total} email mục tiêu. Bắt đầu vòng lặp...`);
  let processedCount = 0;
  let successCount = 0;

  for (const row of examEmails) {
    let threadId = null;

    // Bước khám phá 1: Các thuộc tính tiêu chuẩn và hiện đại
    const idAttrs = ['data-id', 'data-thread-id', 'data-legacy-thread-id', 'id'];
    for (const attr of idAttrs) {
        const val = row.getAttribute(attr);
        if (val && /^[a-f0-9]{16}$/.test(val)) {
            threadId = val;
            break;
        }
    }

    // Bước khám phá 2: Kiểm tra các thành phần con tiêu chuẩn của Gmail (Checkbox, Star)
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

    // Bước khám phá 3: Kiểm tra tất cả các liên kết
    if (!threadId) {
        const links = row.querySelectorAll('a');
        for (const link of links) {
            const href = link.href || "";
            // Tìm mã hex 16 ký tự trong URL
            const matches = href.match(/[a-f0-9]{16}/);
            if (matches) {
                threadId = matches[0];
                break;
            }
        }
    }

    // Bước khám phá 4: Sử dụng RegEx dự phòng trên OuterHTML
    if (!threadId) {
        const matches = row.outerHTML.match(/"([a-f0-9]{16})"/);
        if (matches) {
            threadId = matches[1];
        }
    }
    
    // Xác thực ID cuối cùng
    const isValidId = threadId && /^[a-f0-9]{16}$/.test(threadId);
    
    if (isValidId) {
      try {
        const baseUrl = window.location.origin + window.location.pathname;
        const printUrl = `${baseUrl}?ui=2&ik=${ik}&view=pt&search=all&th=${threadId}`;
        
        console.log(`Tính Điểm IT: Đang xử lý [${processedCount + 1}/${total}] - ID: ${threadId}`);
        
        // Thêm thời gian chờ cho fetch để tránh bị treo trong vài phút
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // Thời gian chờ 8 giây

        const response = await fetch(printUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        
        console.log(`Tính Điểm IT: Đã lấy độ dài HTML cho ${threadId}: ${html.length}`);
        
        const found = scrapeFromText(doc.body, true);
        if (found) {
            successCount++;
        } else {
            console.log(`Tính Điểm IT: Trích xuất không thành công cho ${threadId}. Mẫu nội dung văn bản:`, doc.body.innerText.substring(0, 300));
            // Ghi lại toàn bộ HTML vào console cho một lần thất bại để kiểm tra cấu trúc
            if (successCount === 0 && processedCount === 0) {
               console.log("Tính Điểm IT: Cấu trúc HTML đầy đủ để gỡ lỗi:", html);
            }
        }

      } catch (error) {
        console.error(`Tính Điểm IT: Bỏ qua mục ${threadId} do lỗi:`, error.message);
      }
    } else {
      console.warn("Tính Điểm IT: Bỏ qua hàng - không tìm thấy mã thread ID 16 ký tự. Mẫu HTML hàng:", row.outerHTML.substring(0, 500));
    }
    
    processedCount++;
    chrome.runtime.sendMessage({ action: "SCAN_PROGRESS", current: processedCount, total: total });
    
    // Kiểm tra xem có nên dừng quét không
    if (!isScanning) {
        console.log("Tính Điểm IT: Đang dừng vòng lặp quét theo yêu cầu.");
        break;
    }

    // Độ trễ mượt mà giữa các yêu cầu
    await new Promise(r => setTimeout(r, 800));
  }
  
  isScanning = false;
  console.log(`Tính Điểm IT: Hoàn tất quét hàng loạt. Tổng cộng: ${processedCount}, Thành công: ${successCount}`);
  alert(`Quét hoàn tất!\n\nĐã xử lý: ${processedCount} email.\nĐã lưu điểm: ${successCount} môn học.`);
}

function getIk() {
  // Phương pháp 1: Thuộc tính dữ liệu từ script đã chèn (Chính)
  let ik = document.body.getAttribute('data-ik');
  if (ik) return ik;

  // Phương pháp 2: Tham số URL
  const urlParams = new URLSearchParams(window.location.search);
  ik = urlParams.get('ik');
  if (ik) return ik;

  // Phương pháp 3: Tìm kiếm trong tất cả các thẻ script
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    const content = script.textContent;
    if (!content) continue;
    
    // Mẫu 1: Tìm var GLOBALS=[..., "cf60d70744", ...] (thường ở chỉ số 9)
    if (content.includes("GLOBALS")) {
      const gMatch = content.match(/var\s+GLOBALS\s*=\s*\[([^\]]+)\]/);
      if (gMatch) {
         const parts = gMatch[1].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // Tách bằng dấu phẩy bên ngoài dấu ngoặc kép
         if (parts.length > 9) {
           const val = parts[9].trim().replace(/^["']|["']$/g, '');
           if (val && /^[a-f0-9]{10}$/.test(val)) return val;
         }
      }
    }

    // Mẫu 2: Tìm _GM_setData được sử dụng trong các chế độ xem "pinto" hiện đại
    if (content.includes("_GM_setData")) {
      const sdMatch = content.match(/"w43KIf"\s*:\s*\[\s*"[^"]+"\s*,\s*"[^"]+"\s*,\s*"([^"]+)"/);
      if (sdMatch) return sdMatch[1];
    }
    
    // Mẫu 3: Cặp khóa-giá trị ik tiêu chuẩn
    const match = content.match(/"ik"\s*[:]\s*"([^"]+)"/) || 
                  content.match(/'ik'\s*[:]\s*'([^']+)'/) ||
                  content.match(/["']ik["']\s*,\s*["']([^"']+)["']/) ||
                  content.match(/ik\s*[:]\s*["']([^"']+)["']/);
    
    if (match && match[1] && match[1].length >= 5) return match[1];
  }

  // Phương pháp 4: Tìm kiếm trong tất cả các liên kết trên trang (Dự phòng)
  const links = document.querySelectorAll('a[href*="ik="]');
  for (const link of links) {
    const match = link.href.match(/ik=([^&]+)/);
    if (match && match[1]) return match[1];
  }

  return "";
}

function scrapeFromText(element, isBulk = false) {
  const text = element.innerText || "";
  
  // 1. Thử phân tích bảng (Thường đáng tin cậy hơn cho các email đại học)
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

    // Kiểm tra xem bảng này có giống bảng kết quả không
    const nameKey = Object.keys(tableData).find(k => /Môn|Học phần|Tên/i.test(k));
    const scoreKey = Object.keys(tableData).find(k => /Điểm|Kết quả/i.test(k));
    
    // Trình hỗ trợ để làm sạch giá trị bảng có thể chứa toàn bộ dòng
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
        // Làm sạch nếu nó chứa các tiêu đề (thường xảy ra trong các bảng bố cục)
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
        const attemptKey = Object.keys(tableData).find(k => /Lần/i.test(k) && !/vắng/i.test(k));
        let attempt = 1;
        if (attemptKey) {
           const attemptMatch = tableData[attemptKey].match(/(\d+)/);
           attempt = attemptMatch ? parseInt(attemptMatch[1]) : 1;
        }
        
        const statusText = isAbsent ? "Vắng" : "Cấm";
        console.log(`Tính Điểm IT: Khớp bảng (${statusText})! ${finalName}, Lần: ${attempt}`);
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
        const attemptKey = Object.keys(tableData).find(k => /Lần/i.test(k) && !/vắng/i.test(k));
        let attempt = 1;
        if (attemptKey) {
           const attemptMatch = tableData[attemptKey].match(/(\d+)/);
           attempt = attemptMatch ? parseInt(attemptMatch[1]) : 1;
        }

        console.log(`Tính Điểm IT: Khớp bảng! ${finalName}: ${score}, Lần: ${attempt}`);
        saveToStorage([{ name: finalName, score: score, attempt: attempt }], isBulk);
        return true;
      }
    }
  }

  if (isBulk && text.length < 50) {
    console.log("Tính Điểm IT: Văn bản quá ngắn hoặc trống khi quét hàng loạt:", text);
  }
  
  // 2. Dự phòng bằng các mẫu Regex
  const patterns = {
    name: /(?:Môn thi|Tên môn|Học phần|Môn học|Môn|Tên học phần)\s*[:\-]\s*(.+?)(?=\s*(?:Loại|Lần|Ngày|Điểm|Kết|;|[\n\r\t]|$))/i,
    score: /(?:Điểm thi|Điểm kết thúc|Kết quả|Điểm|Kết quả thi)\s*[:\-]\s*([\d,.]+|vắng\s*thi|cấm\s*thi)/i,
    type: /(?:Loại thi|Loại|Hình thức)\s*[:\-]\s*(.+?)(?=\s*(?:Lần|Ngày|Điểm|Kết|;|[\n\r\t]|$))/i,
    attempt: /(?:Lần thi|Lần)\s*[:\-]\s*(\d+)/i
  };

  const nameMatch = text.match(patterns.name);
  let scoreMatch = text.match(patterns.score);
  
  // Dự phòng mạnh mẽ cho 'vắng thi' hoặc 'cấm thi' nếu các nhãn cụ thể không khớp
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
        console.warn("Tính Điểm IT: Điểm bị lỗi NaN cho", subjectName, scoreRaw);
        return false;
      }
    }

    const typeMatch = text.match(patterns.type);
    const type = typeMatch ? typeMatch[1].trim() : "";
    
    const attemptMatch = text.match(patterns.attempt);
    const attempt = attemptMatch ? parseInt(attemptMatch[1]) : 1;

    const finalName = type ? `${subjectName} (${type})` : subjectName;
    const data = [{ name: finalName, score: score, attempt: attempt }];

    console.log(`Tính Điểm IT: Khớp Regex! ${finalName}: ${score}`);
    saveToStorage(data, isBulk);
    return true;
  } else {
    if (isBulk && (text.includes("Điểm") || text.includes("Kết quả"))) {
       console.log("Tính Điểm IT: Trích xuất văn bản thất bại. Mẫu:", text.substring(0, 150));
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
      // Tìm môn học theo tên (không phân biệt hoa thường)
      const existing = existingSubjects.find(s => s.name.toLowerCase().trim() === item.name.toLowerCase().trim());
      const attemptNum = parseInt(item.attempt) || 1;
      const gradeIndex = Math.min(Math.max(attemptNum - 1, 0), 2);
      
      if (existing) {
        // Dọn dẹp dữ liệu khi thi nhiều lần: Nếu tìm thấy điểm số thực cho Lần 2+ nhưng trước đó là "Vắng", xóa bảng.
        const isNumeric = typeof item.score === 'number';
        const hadAbsent = existing.grades.some(g => g === "Vắng");

        if (attemptNum > 1 && isNumeric && hadAbsent) {
          console.log(`Tính Điểm IT: Phát hiện điểm số cho ${item.name} sau khi 'Vắng'. Đang đặt lại bảng điểm.`);
          existing.grades = [null, null, null];
          updated = true;
        }

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

// Theo dõi Gmail để biết các thay đổi điều hướng (đây là Ứng dụng Trang Đơn - SPA)
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(scrapeExamData, 1500);
  } else {
    // Kiểm tra giới hạn (throttled) cho các thay đổi nội dung
    if (!window._td_it_throttle) {
      window._td_it_throttle = true;
      scrapeExamData();
      setTimeout(() => window._td_it_throttle = false, 2000);
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Kích hoạt ban đầu
window.addEventListener('load', () => setTimeout(scrapeExamData, 2000));
