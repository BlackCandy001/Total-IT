function processExamTable(table) {
  // simulate table parsing
  const scoreStr = "vắng thi";
  const score = parseFloat(scoreStr.replace(',', '.'));
  console.log("score:", score);
  if (!isNaN(score)) {
     console.log("Pushed to data!");
  } else {
     console.log("Ignored!");
  }
}
processExamTable();
