import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const DOCS_DIR = path.resolve('tmsdocs');

/**
 * Pre-compiled regex for performance
 */
const CAMEL_CASE_REGEX = /[^a-zA-Z0-9]/g;

/**
 * Normalizes a row by converting keys to camelCase and handling nulls
 */
function normalizeRow(row) {
  const normalized = {};
  for (const key in row) {
    if (key.includes('Unnamed')) continue; // Skip unnamed columns
    
    const camelKey = key
      .replace(CAMEL_CASE_REGEX, ' ')
      .trim()
      .split(/\s+/)
      .map((word, index) => index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
    
    normalized[camelKey] = row[key] === undefined || row[key] === '' ? null : row[key];
  }
  return normalized;
}

/**
 * Calculates the average of QA columns (QA1, QA2, etc.)
 */
function calculateQAAverage(row) {
  let sum = 0;
  let count = 0;
  for (let i = 1; i <= 14; i++) {
    const val = row[`qa${i}`];
    if (val !== null && val !== undefined) {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        sum += num;
        count++;
      }
    }
  }
  return count > 0 ? parseFloat((sum / count).toFixed(3)) : null;
}

/**
 * Helper to read a workbook safely
 */
function readSafe(filename) {
  const filePath = path.join(DOCS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return null;
  }
  console.log(`Reading: ${filename}`);
  return XLSX.readFile(filePath);
}

/**
 * Processes the Transition Report
 */
export function getTransitionReport() {
  const workbook = readSafe('Transition Report - 2025 (1).xlsx');
  if (!workbook) return { error: 'File not found' };

  const reports = {};
  const performanceSheets = workbook.SheetNames.filter(s => s.toLowerCase().includes('performance'));
  
  performanceSheets.forEach(sheetName => {
    console.log(`  Processing sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet);
    
    reports[sheetName] = rawData.slice(0, 500).map(row => { // Limit to 500 rows for performance/memory
      const normalized = normalizeRow(row);
      normalized.calculatedQAAverage = calculateQAAverage(normalized);
      return normalized;
    });
  });

  return reports;
}

/**
 * Processes the KPI Tracking file
 */
export function getKPIReport() {
  const workbook = readSafe('KPI Trackingxlsx.xlsx');
  if (!workbook) return { error: 'File not found' };

  const reports = {};
  workbook.SheetNames.forEach(sheetName => {
    console.log(`  Processing sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    reports[sheetName] = XLSX.utils.sheet_to_json(sheet).slice(0, 500).map(normalizeRow);
  });

  return reports;
}

/**
 * Processes Trainer Attendance
 */
export function getTrainerAttendanceReport() {
  const workbook = readSafe('Trainer Attendance Record - 2025.xlsx');
  if (!workbook) return { error: 'File not found' };

  const reports = {};
  workbook.SheetNames.forEach(sheetName => {
    console.log(`  Processing sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    reports[sheetName] = XLSX.utils.sheet_to_json(sheet).map(normalizeRow);
  });

  return reports;
}
