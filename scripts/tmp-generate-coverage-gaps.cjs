const fs = require("fs");
const path = require("path");

const root = process.cwd();
const coveragePath = path.join(root, "coverage", "coverage-final.json");
const outputPath = path.join(root, "coverage-gaps.txt");
const MAX_LINES = 150;

function pct(covered, total) {
  return total === 0 ? 100 : (covered / total) * 100;
}

function fileMetrics(fileCoverage) {
  const statements = fileCoverage.s || {};
  const functions = fileCoverage.f || {};
  const branches = fileCoverage.b || {};
  const statementMap = fileCoverage.statementMap || {};

  const statementTotal = Object.keys(statements).length;
  const statementCovered = Object.values(statements).filter((v) => v > 0).length;

  const functionTotal = Object.keys(functions).length;
  const functionCovered = Object.values(functions).filter((v) => v > 0).length;

  let branchTotal = 0;
  let branchCovered = 0;
  for (const arr of Object.values(branches)) {
    if (!Array.isArray(arr)) continue;
    branchTotal += arr.length;
    branchCovered += arr.filter((v) => v > 0).length;
  }

  const lineMap = {};
  for (const [statementId, loc] of Object.entries(statementMap)) {
    const line = loc?.start?.line;
    if (!line) continue;

    const hits = Number(statements[statementId] ?? 0);
    if (!(line in lineMap) || hits > lineMap[line]) {
      lineMap[line] = hits;
    }
  }

  const lineHits = Object.values(lineMap);
  const lineTotal = lineHits.length;
  const lineCovered = lineHits.filter((v) => v > 0).length;

  return {
    lines: pct(lineCovered, lineTotal),
    branches: pct(branchCovered, branchTotal),
    functions: pct(functionCovered, functionTotal),
    statements: pct(statementCovered, statementTotal),
    lineCovered,
    lineTotal,
    branchCovered,
    branchTotal,
    functionCovered,
    functionTotal,
    statementCovered,
    statementTotal,
  };
}

const coverage = JSON.parse(fs.readFileSync(coveragePath, "utf8"));
const rows = [];
const totals = {
  lineCovered: 0,
  lineTotal: 0,
  branchCovered: 0,
  branchTotal: 0,
  functionCovered: 0,
  functionTotal: 0,
  statementCovered: 0,
  statementTotal: 0,
};

for (const [absPath, fileCoverage] of Object.entries(coverage)) {
  const relPath = path.relative(root, absPath).split(path.sep).join("/");
  const metrics = fileMetrics(fileCoverage);

  rows.push({
    path: relPath,
    lines: metrics.lines,
    branches: metrics.branches,
    functions: metrics.functions,
  });

  totals.lineCovered += metrics.lineCovered;
  totals.lineTotal += metrics.lineTotal;
  totals.branchCovered += metrics.branchCovered;
  totals.branchTotal += metrics.branchTotal;
  totals.functionCovered += metrics.functionCovered;
  totals.functionTotal += metrics.functionTotal;
  totals.statementCovered += metrics.statementCovered;
  totals.statementTotal += metrics.statementTotal;
}

const overallLines = pct(totals.lineCovered, totals.lineTotal);
const overallBranches = pct(totals.branchCovered, totals.branchTotal);
const overallFunctions = pct(totals.functionCovered, totals.functionTotal);
const overallStatements = pct(totals.statementCovered, totals.statementTotal);

const below95 = rows
  .filter((r) => r.lines < 95)
  .sort((a, b) => a.lines - b.lines || a.path.localeCompare(b.path));

const zeroCount = rows.filter((r) => r.lines === 0).length;

const lines = [];
lines.push(
  `TOTAL | lines ${overallLines.toFixed(2)}% | branches ${overallBranches.toFixed(2)}% | functions ${overallFunctions.toFixed(2)}% | statements ${overallStatements.toFixed(2)}%`
);

const maxFileLines = Math.max(0, MAX_LINES - 2);
for (const row of below95.slice(0, maxFileLines)) {
  lines.push(
    `${row.path} | ${row.lines.toFixed(2)}% | ${row.branches.toFixed(2)}% | ${row.functions.toFixed(2)}%`
  );
}

lines.push(`0% files: ${zeroCount}`);

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${outputPath} with ${lines.length} lines`);
