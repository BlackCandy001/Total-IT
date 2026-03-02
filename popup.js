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

  const PASS_THRESHOLD = 40;
  let subjects = [];

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
      const searchTerm = e.target.value.toLowerCase();
      const cards = subjectsContainer.querySelectorAll(".subject-card");
      
      cards.forEach(card => {
        const subjectName = card.querySelector(".subject-name").textContent.toLowerCase();
        if (subjectName.includes(searchTerm)) {
          card.style.display = "flex";
        } else {
          card.style.display = "none";
        }
      });
    });
  }

  // Sort functionality (group similar names)
  if (sortSubjectBtn) {
    sortSubjectBtn.addEventListener("click", () => {
      if (subjects.length === 0) {
        alert("Chưa có môn học nào để sắp xếp!");
        return;
      }
      // Sort the array by name alphabetically (groups similar names together)
      subjects.sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true, sensitivity: 'base' }));
      
      // Update DOM by re-appending children in sorted order
      subjects.forEach(subject => {
        const card = subjectsContainer.querySelector(`.subject-card[data-id="${subject.id}"]`);
        if (card) {
          subjectsContainer.appendChild(card);
        }
      });
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
    renderSubject(subject);
  }

  function renderSubject(subject) {
    const card = document.createElement("div");
    card.className = "subject-card";
    card.dataset.id = subject.id;

    card.innerHTML = `
      <div class="subject-header">
        <span class="subject-name">${subject.name}</span>
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
            (num) => `
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
              />
            </div>
            <div class="status-badge hidden"></div>
          </div>
        `
          )
          .join("")}
      </div>
      <div class="subject-footer">
        <div class="status-dot pending" title="Dựa trên kết quả cuối cùng"></div>
      </div>
    `;

    // Handle removal
    card.querySelector(".remove-btn").addEventListener("click", () => {
      subjects = subjects.filter((s) => s.id !== subject.id);
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

        // Update overall status (based on the last entered non-empty grade)
        const nonNullGrades = subject.grades.filter(g => g !== null && !isNaN(g));
        if (nonNullGrades.length === 0) {
          statusDot.className = "status-dot pending";
        } else {
          const lastGrade = nonNullGrades[nonNullGrades.length - 1];
          statusDot.className = lastGrade >= PASS_THRESHOLD ? "status-dot pass" : "status-dot fail";
        }
      });
    });

    subjectsContainer.appendChild(card);
    card.scrollIntoView({ behavior: "smooth", block: "end" });
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
          table { border-collapse: collapse; width: 100%; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          th { background-color: #3686ff; color: white; font-weight: bold; border: 1px solid #2a6ed3; padding: 10px; }
          td { border: 1px solid #dddddd; padding: 8px; text-align: center; }
          .subject-name { background-color: #f8f9fa; font-weight: bold; text-align: left; color: #333; }
          .bg-pass { background-color: #22c55e; color: white; font-weight: bold; }
          .bg-fail { background-color: #ef4444; color: white; font-weight: bold; }
          .bg-pending { background-color: #a8a8a8; color: white; font-weight: bold; }
          .not-entered { color: #a8a8a8; font-style: italic; }
          h2 { color: #1a1a1a; text-align: center; }
        </style>
      </head>
      <body>
        <h2>BÁO CÁO TỔNG HỢP ĐIỂM IT</h2>
        <p>Ngày xuất: ${new Date().toLocaleString("vi-VN")}</p>
        <table>
          <thead>
            <tr>
              <th style="width: 150px;">Môn học</th>
              <th style="width: 80px;">Điểm 1</th>
              <th style="width: 100px;">Trạng thái 1</th>
              <th style="width: 80px;">Điểm 2</th>
              <th style="width: 100px;">Trạng thái 2</th>
              <th style="width: 80px;">Điểm 3</th>
              <th style="width: 100px;">Trạng thái 3</th>
              <th style="width: 100px;">Kết quả</th>
            </tr>
          </thead>
          <tbody>
            ${subjects
              .map((subject) => {
                const nonNullGrades = subject.grades.filter(g => g !== null && !isNaN(g));
                let overallStyle = "bg-pending";
                let overallText = "-";
                
                if (nonNullGrades.length > 0) {
                  const lastGrade = nonNullGrades[nonNullGrades.length - 1];
                  overallStyle = lastGrade >= PASS_THRESHOLD ? "bg-pass" : "bg-fail";
                  overallText = lastGrade >= PASS_THRESHOLD ? "ĐẠT" : "KHÔNG ĐẠT";
                }

                const gradesHTML = subject.grades
                  .map((grade) => {
                    if (grade !== null) {
                      const bgClass = grade >= PASS_THRESHOLD ? "bg-pass" : "bg-fail";
                      return `<td>${grade.toString().replace(".", ",")}</td><td class="${bgClass}"></td>`;
                    } else {
                      return `<td class="not-entered">-</td><td class="bg-pending"></td>`;
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
            const nonNullGrades = subject.grades.filter(g => g !== null && !isNaN(g));
            return nonNullGrades.length > 0 && nonNullGrades[nonNullGrades.length - 1] < PASS_THRESHOLD;
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
                    const nonNullGrades = s.grades.filter(g => g !== null && !isNaN(g));
                    const lastGrade = nonNullGrades[nonNullGrades.length - 1];
                    return `
                      <tr>
                        <td class="subject-name">${s.name}</td>
                        <td>${lastGrade.toString().replace(".", ",")}</td>
                        <td class="bg-fail">KHÔNG ĐẠT</td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          `;
        })()}
      </body>
      </html>
    `;

    const blob = new Blob([template], { type: "application/vnd.ms-excel" });
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
