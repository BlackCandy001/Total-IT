// Mock implementations for saveToStorage
function saveToStorage(data) {
    console.log("Mock saveToStorage called with:", JSON.stringify(data, null, 2));
}

// Emulate processExamTable with mock table
function processExamTable(table) {
  const rows = table;
  let headerRowIndex = 0;
  let headers = rows[0].map(c => c.toLowerCase());

  const dataFound = [];
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const cells = rows[i];
    if (cells.length < 2) continue;

    const entry = {};
    cells.forEach((text, index) => {
      if (headers[index]) entry[headers[index]] = text;
    });

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

const mockTableData = [
    ["Môn thi", "Lần thi", "Điểm thi"],
    ["Lập trình C", "2", "vắng thi"],
    ["Nhập môn CNTT", "", "vắng thi"], // Empty 'Lần thi' should evaluate to 1
    ["Cơ sở dữ liệu", "3", "Cấm thi"]
];

console.log("--- Testing Table Parsing ---");
processExamTable(mockTableData);

// Testing the fix in scrapeFromText
function testScrapeFromTextTable() {
    const tableData = {
        "Môn thi": "Kỹ năng mềm",
        "Lần thi": "1",
        "Số lần vắng": "3",
        "Điểm thi": "Vắng thi"
    };
    
    const isAbsent = /vắng\s*thi/i.test(tableData["Điểm thi"]);
    const finalName = tableData["Môn thi"];
    
    // Testing the NEW attemptKey finder:
    const attemptKey = Object.keys(tableData).find(k => /Lần/i.test(k) && !/vắng/i.test(k));
    let attempt = 1;
    if (attemptKey) {
        const attemptMatch = tableData[attemptKey].match(/(\d+)/);
        attempt = attemptMatch ? parseInt(attemptMatch[1]) : 1;
    }
    
    console.log("\n--- Testing Text (Table format fallback) Parsing ---");
    console.log("Môn:", finalName, "| Điểm:", isAbsent ? "Vắng" : "", "| Lần thi (parsed):", attempt);
}

testScrapeFromTextTable();
