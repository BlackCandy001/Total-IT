const patterns = {
    name: /(?:Môn thi|Tên môn|Học phần|Môn học|Môn|Tên học phần)\s*[:\-]\s*(.+?)(?=\s*(?:Loại|Lần|Ngày|Điểm|Kết|;|[\n\r\t]|$))/i,
    score: /(?:Điểm thi|Điểm kết thúc|Kết quả|Điểm|Kết quả thi)\s*[:\-]\s*([\d,.]+|vắng\s*thi|cấm\s*thi)/i,
    type: /(?:Loại thi|Loại|Hình thức)\s*[:\-]\s*(.+?)(?=\s*(?:Lần|Ngày|Điểm|Kết|;|[\n\r\t]|$))/i,
    attempt: /(?:Lần thi|Lần)\s*[:\-]\s*(\d+)/i
};

const text1 = "Môn thi: Essentials of NodeJS (Thực hành) Điểm thi: vắng thi";
const text2 = "KẾT QUẢ HỌC TẬP\nMôn: Essentials of NodeJS (Thực hành)\nLoại thi: Thực hành\nLần thi: 1\nĐiểm: Vắng thi";

function test(text) {
    let attemptMatch = text.match(patterns.attempt);
    console.log("Attempt Match for text:", attemptMatch);
    
    let attempt = attemptMatch ? parseInt(attemptMatch[1]) : 1;
    console.log("Attempt parsed:", attempt);
}

test(text1);
test(text2);
