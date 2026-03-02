document.addEventListener("DOMContentLoaded", () => {
  const subjectSelect = document.getElementById("subject-select");
  const customSubjectInput = document.getElementById("custom-subject");
  const addSubjectBtn = document.getElementById("add-subject-btn");
  const sortSubjectBtn = document.getElementById("sort-subject-btn");
  const subjectsContainer = document.getElementById("subjects-container");
  const searchInput = document.getElementById("search-subject");
  const exportBtn = document.getElementById("export-btn");
  const backToTopBtn = document.getElementById("back-to-top-btn");
  const panelBody = document.querySelector(".panel-body");
  const autoSyncToggle = document.getElementById("auto-sync-toggle");
  const bulkScanBtn = document.getElementById("bulk-scan-btn");
  const progressContainer = document.getElementById("scan-progress-container");
  const scanCount = document.getElementById("scan-count");
  const progressFill = document.getElementById("scan-progress-fill");
  const stopScanBtn = document.getElementById("stop-scan-btn");
  const clearAllBtn = document.getElementById("clear-all-btn");

  const PASS_THRESHOLD = 40;
  let subjects = [];

  // Handle Clear All
  clearAllBtn.addEventListener("click", () => {
    if (confirm("Bạn có chắc chắn muốn xóa TẤT CẢ môn học và điểm không? Hành động này không thể hoàn tác.")) {
      chrome.storage.local.set({ subjects: [] }, () => {
        subjects = [];
        subjectsContainer.innerHTML = "";
        console.log("Tính Điểm IT: All subjects cleared.");
      });
    }
  });

  // Handle Bulk Scan
  bulkScanBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) return;
    
    const isGmail = tab.url && tab.url.includes("mail.google.com");
    console.log("Tính Điểm IT: Active tab URL:", tab.url);

    if (!isGmail) {
      alert("Vui lòng mở Gmail để thực hiện quét toàn bộ!");
      return;
    }

    bulkScanBtn.disabled = true;
    bulkScanBtn.classList.add("scanning");
    const originalContent = bulkScanBtn.innerHTML;
    bulkScanBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      Đang quét dữ liệu...
    `;

    progressContainer.classList.remove("hidden");
    if (stopScanBtn) stopScanBtn.classList.remove("hidden");
    scanCount.innerText = "0";
    progressFill.style.width = "0%";

    chrome.tabs.sendMessage(tab.id, { action: "START_BULK_SCAN" });

    // Store original content to restore later
    bulkScanBtn.dataset.originalContent = originalContent;
  });

  // Handle Stop Scan
  if (stopScanBtn) {
    stopScanBtn.addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { action: "STOP_SCAN" });
      }
      resetScanButton();
    });
  }

  // Listen for scan progress from content.js
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "SCAN_PROGRESS") {
      if (message.total === 0) {
        resetScanButton();
        return;
      }

      scanCount.innerText = message.current;
      const progress = (message.current / message.total) * 100;
      progressFill.style.width = `${progress}%`;
      
      if (message.current === message.total) {
        setTimeout(() => {
          resetScanButton();
          alert(`Đã hoàn tất! Đã quét xong ${message.total} email.`);
        }, 1000);
      }
    }
  });

  function resetScanButton() {
    bulkScanBtn.disabled = false;
    bulkScanBtn.classList.remove("scanning");
    if (bulkScanBtn.dataset.originalContent) {
      bulkScanBtn.innerHTML = bulkScanBtn.dataset.originalContent;
    }
    progressContainer.classList.add("hidden");
    if (stopScanBtn) stopScanBtn.classList.add("hidden");
  }

  // Load sync toggle state
  chrome.storage.local.get(['autoSyncEnabled'], (result) => {
    // Default to true if not set
    const enabled = result.autoSyncEnabled !== false;
    autoSyncToggle.checked = enabled;
  });

  autoSyncToggle.addEventListener('change', () => {
    chrome.storage.local.set({ autoSyncEnabled: autoSyncToggle.checked });
  });

  // Load data on start
  loadFromStorage();

  // Listen for storage changes (for sync from content.js)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.subjects) {
      subjects = changes.subjects.newValue || [];
      renderAllSubjects();
    }
  });

  async function loadFromStorage() {
    chrome.storage.local.get(['subjects'], (result) => {
      subjects = result.subjects || [];
      renderAllSubjects();
    });
  }

  function saveToStorage() {
    chrome.storage.local.set({ subjects });
  }

  function renderAllSubjects() {
    subjectsContainer.innerHTML = "";
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    
    subjects.forEach(subject => {
      if (!searchTerm || subject.name.toLowerCase().includes(searchTerm)) {
        renderSubject(subject);
      }
    });
  }

  // Handle custom subject visibility
  subjectSelect.addEventListener("change", () => {
    if (subjectSelect.value === "custom") {
      customSubjectInput.classList.remove("hidden");
    } else {
      customSubjectInput.classList.add("hidden");
    }
  });

  // Search functionality
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      renderAllSubjects();
    });
  }

  // Sort functionality (group similar names)
  if (sortSubjectBtn) {
    sortSubjectBtn.addEventListener("click", () => {
      if (subjects.length === 0) {
        alert("Chưa có môn học nào để sắp xếp!");
        return;
      }
      subjects.sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true, sensitivity: 'base' }));
      saveToStorage(); // Persist the new order
      renderAllSubjects();
    });
  }

  // Add subject functionality
  addSubjectBtn.addEventListener("click", () => {
    const subjectName =
      subjectSelect.value === "custom"
        ? customSubjectInput.value.trim()
        : subjectSelect.options[subjectSelect.selectedIndex].text;

    if (!subjectName) {
      alert("Vui lòng nhập hoặc chọn tên môn học!");
      return;
    }

    addSubject(subjectName);
    
    // Reset inputs
    if (subjectSelect.value === "custom") {
      customSubjectInput.value = "";
    }
  });

  function addSubject(name) {
    const id = Date.now();
    const subject = {
      id,
      name,
      grades: [null, null, null],
    };

    subjects.push(subject);
    saveToStorage();
    renderSubject(subject);
  }

  function renderSubject(subject) {
    const card = document.createElement("div");
    card.className = "subject-card";
    if (subject.autoSynced) card.classList.add("auto-synced");
    card.dataset.id = subject.id;

    card.innerHTML = `
      <div class="subject-header">
        <div class="subject-name-wrapper">
          <span class="subject-name">${subject.name}</span>
          ${subject.autoSynced ? '<span class="sync-badge" title="Tự động thu thập từ Gmail">Gmail</span>' : ''}
        </div>
        <button class="remove-btn" title="Xóa môn này">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
      <div class="grades-list">
        ${[1, 2, 3]
          .map(
            (num) => {
              const val = subject.grades[num-1];
              const isSet = val !== null;
              const numericVal = typeof val === 'number' ? val : (val ? 0 : null);
              const isPass = typeof val === 'number' ? val >= PASS_THRESHOLD : false;
              const badgeClass = isSet ? (isPass ? "status-badge pass" : "status-badge fail") : "status-badge hidden";
              return `
                <div class="grade-row">
                  <div class="grade-input-wrapper">
                    <input
                      type="number"
                      class="grade-input"
                      data-index="${num - 1}"
                      placeholder="Điểm ${num}"
                      min="0"
                      max="100"
                      step="0.1"
                      value="${numericVal !== null ? numericVal : ''}"
                    />
                  </div>
                  ${(val === "Vắng" || val === "Cấm") ? `<span class="special-status-label">${val}</span>` : ""}
                  <div class="${badgeClass}"></div>
                </div>
              `;
            }
          )
          .join("")}
      </div>
      <div class="subject-footer">
        <div class="status-dot ${getOverallStatus(subject)}" title="Dựa trên kết quả cuối cùng"></div>
      </div>
    `;

    // Handle removal
    card.querySelector(".remove-btn").addEventListener("click", () => {
      subjects = subjects.filter((s) => s.id !== subject.id);
      saveToStorage();
      card.remove();
    });

    const statusDot = card.querySelector(".status-dot");

    // Handle grade changes
    const inputs = card.querySelectorAll(".grade-input");
    inputs.forEach((input) => {
      input.addEventListener("input", (e) => {
        const index = parseInt(e.target.dataset.index);
        const val = parseFloat(e.target.value);
        const statusBadge = e.target.parentElement.nextElementSibling;

        if (isNaN(val)) {
          subject.grades[index] = null;
          statusBadge.classList.add("hidden");
        } else {
          subject.grades[index] = val;
          statusBadge.classList.remove("hidden");
          if (val >= PASS_THRESHOLD) {
            statusBadge.className = "status-badge pass";
          } else {
            statusBadge.className = "status-badge fail";
          }
        }

        saveToStorage();

        // Update overall status
        statusDot.className = `status-dot ${getOverallStatus(subject)}`;
      });
    });

    subjectsContainer.appendChild(card);
  }

  function getOverallStatus(subject) {
    const nonNullGrades = subject.grades.filter(g => g !== null && !isNaN(g));
    if (nonNullGrades.length === 0) return "pending";
    const lastGrade = nonNullGrades[nonNullGrades.length - 1];
    if (typeof lastGrade === 'string') return "fail";
    return lastGrade >= PASS_THRESHOLD ? "pass" : "fail";
  }

  // Export functionality (Beautiful HTML-based Excel)
  exportBtn.addEventListener("click", () => {
    if (subjects.length === 0) {
      alert("Chưa có dữ liệu để xuất!");
      return;
    }

    const template = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <style>
          table { border-collapse: collapse; margin-bottom: 20px; font-family: 'Segoe UI', Tahoma, sans-serif; }
          th { background-color: #3686ff; color: white; border: 1px solid #2a6ed3; padding: 12px 8px; white-space: nowrap; }
          td { border: 1px solid #dddddd; padding: 10px 8px; text-align: center; vertical-align: middle; white-space: nowrap; }
          .subject-name { background-color: #f8f9fa; font-weight: bold; text-align: left; min-width: 250px; color: #333; }
          .bg-pass { background-color: #22c55e; color: white; font-weight: bold; }
          .bg-fail { background-color: #ef4444; color: white; font-weight: bold; }
          .bg-pending { background-color: #a8a8a8; color: white; font-weight: bold; }
          .not-entered { color: #a8a8a8; font-style: italic; }
          h2 { color: #1a1a1a; text-align: left; border-bottom: 2px solid #3686ff; padding-bottom: 10px; }
        </style>
      </head>
      <body>
        <h2>BÁO CÁO TỔNG HỢP ĐIỂM IT</h2>
        <p>Ngày xuất: ${new Date().toLocaleString("vi-VN")}</p>
        <table>
          <thead>
            <tr>
              <th style="width: 300px;">Môn học</th>
              <th style="width: 100px;">Lần 1</th>
              <th style="width: 120px;">Trạng thái</th>
              <th style="width: 100px;">Lần 2</th>
              <th style="width: 120px;">Trạng thái</th>
              <th style="width: 100px;">Lần 3</th>
              <th style="width: 120px;">Trạng thái</th>
              <th style="width: 120px; background-color: #1a1a1a;">KẾT QUẢ</th>
            </tr>
          </thead>
          <tbody>
            ${subjects
              .filter(s => {
                  const ng = s.grades.filter(g => g !== null);
                  return ng.length === 0 || ng[ng.length - 1] !== "Vắng";
              })
              .map((subject) => {
                const nonNullGrades = subject.grades.filter(g => g !== null);
                let overallStyle = "bg-pending";
                let overallText = "-";
                
                if (nonNullGrades.length > 0) {
                  const lastGrade = nonNullGrades[nonNullGrades.length - 1];
                  const isPass = typeof lastGrade === 'number' && lastGrade >= PASS_THRESHOLD;
                  overallStyle = isPass ? "bg-pass" : "bg-fail";
                  overallText = isPass ? "ĐẠT" : (lastGrade === "Cấm" ? "CẤM THI" : "KHÔNG ĐẠT");
                }

                const gradesHTML = subject.grades
                  .map((grade) => {
                    if (grade !== null) {
                      const isPass = typeof grade === 'number' && grade >= PASS_THRESHOLD;
                      const bgClass = isPass ? "bg-pass" : "bg-fail";
                      const textStatus = isPass ? "Đạt" : (typeof grade === 'string' ? grade : "Trượt");
                      const displayScore = typeof grade === 'number' ? grade.toString().replace(".", ",") : "0";
                      return `<td>${displayScore}</td><td class="${bgClass}">${textStatus}</td>`;
                    } else {
                      return `<td class="not-entered">-</td><td class="bg-pending">Chờ</td>`;
                    }
                  })
                  .join("");
                return `<tr><td class="subject-name">${subject.name}</td>${gradesHTML}<td class="${overallStyle}">${overallText}</td></tr>`;
              })
              .join("")}
          </tbody>
        </table>

        ${(() => {
          const failedSubjects = subjects.filter(subject => {
            const ng = subject.grades.filter(g => g !== null);
            if (ng.length === 0) return false;
            const last = ng[ng.length - 1];
            return (typeof last === 'number' && last < PASS_THRESHOLD) || last === "Cấm";
          });

          if (failedSubjects.length === 0) return "";

          return `
            <h2 style="margin-top: 40px; color: #ef4444;">DANH SÁCH MÔN CHƯA ĐẠT</h2>
            <table>
              <thead>
                <tr>
                  <th style="width: 250px; background-color: #ef4444;">Môn học</th>
                  <th style="width: 150px; background-color: #ef4444;">Điểm cuối cùng</th>
                  <th style="width: 150px; background-color: #ef4444;">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                ${failedSubjects
                  .map(s => {
                    const ng = s.grades.filter(g => g !== null);
                    const lastGrade = ng[ng.length - 1];
                    const displayGrade = typeof lastGrade === 'number' ? lastGrade.toString().replace(".", ",") : "0";
                    const statusText = lastGrade === "Cấm" ? "CẤM THI" : "KHÔNG ĐẠT";
                    return `
                      <tr>
                        <td class="subject-name">${s.name}</td>
                        <td>${displayGrade}</td>
                        <td class="bg-fail">${statusText}</td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          `;
        })()}

        ${(() => {
          const unclearSubjects = subjects.filter(subject => {
            const ng = subject.grades.filter(g => g !== null);
            return ng.length > 0 && ng[ng.length - 1] === "Vắng";
          });

          if (unclearSubjects.length === 0) return "";

          return `
            <h2 style="margin-top: 40px; color: #f59e0b;">DANH SÁCH MÔN CHƯA RÕ KẾT QUẢ (VẮNG THI)</h2>
            <table>
              <thead>
                <tr>
                  <th style="width: 250px; background-color: #f59e0b;">Môn học</th>
                  <th style="width: 150px; background-color: #f59e0b;">Trạng thái</th>
                  <th style="width: 150px; background-color: #f59e0b;">Lưu ý</th>
                </tr>
              </thead>
              <tbody>
                ${unclearSubjects
                  .map(s => `
                    <tr>
                      <td class="subject-name">${s.name}</td>
                      <td style="background-color: #fef3c7; color: #92400e; font-weight: bold;">VẮNG THI</td>
                      <td style="text-align: left;">Chưa rõ kết quả cuối cùng</td>
                    </tr>
                  `)
                  .join("")}
              </tbody>
            </table>
          `;
        })()}
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff", template], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `Bang_Diem_IT_${new Date().getTime()}.xls`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  });

  // Show/hide back to top button
  panelBody.addEventListener("scroll", () => {
    if (panelBody.scrollTop > 50) {
      backToTopBtn.classList.add("visible");
    } else {
      backToTopBtn.classList.remove("visible");
    }
  });

  // Scroll to top
  backToTopBtn.addEventListener("click", () => {
    panelBody.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
});
