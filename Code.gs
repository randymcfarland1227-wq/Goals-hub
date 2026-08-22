/**
 * Backend for the Goals Hub site. Paste this into Extensions > Apps Script on the
 * "Life and Present Goals" spreadsheet, then deploy as a Web App (see SETUP.md).
 *
 * Endpoints (all on the same Web App URL):
 *   GET  ?action=reviews  -> [{date, category, categoryId, effortId, effort, momentum, notes}]
 *   POST {action:'addReviewBatch', rows:[{date, category, categoryId, effortId, effort, momentum, notes}, ...]}
 *
 * Reviews live in their own auto-created "Goal Reviews" tab, kept separate from
 * your original Dream Board / Effort tables so nothing there gets touched.
 */

var REVIEWS_SHEET_NAME = 'Goal Reviews';
var REVIEWS_HEADERS = ['Date', 'Category', 'Category ID', 'Effort ID', 'Effort', 'Momentum', 'Notes'];

function doGet(e) {
  var action = e.parameter.action;
  if (action === 'reviews') return jsonOut(getReviews());
  return jsonOut({ error: 'unknown action' });
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var action = body.action;
  if (action === 'addReviewBatch') return jsonOut(addReviewBatch(body.rows || []));
  return jsonOut({ error: 'unknown action' });
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getReviewsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(REVIEWS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(REVIEWS_SHEET_NAME);
    sheet.appendRow(REVIEWS_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getReviews() {
  var sheet = getReviewsSheet();
  var data = sheet.getDataRange().getValues();
  var out = [];
  for (var r = 1; r < data.length; r++) {
    if (!data[r][0] && !data[r][3]) continue;
    out.push({
      date: formatDate(data[r][0]),
      category: data[r][1],
      categoryId: data[r][2],
      effortId: data[r][3],
      effort: data[r][4],
      momentum: data[r][5],
      notes: data[r][6],
    });
  }
  return out;
}

function addReviewBatch(rows) {
  if (!rows.length) return { ok: true, count: 0 };
  var sheet = getReviewsSheet();
  var values = rows.map(function (row) {
    return [row.date, row.category, row.categoryId, row.effortId, row.effort, row.momentum, row.notes];
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, REVIEWS_HEADERS.length).setValues(values);
  return { ok: true, count: values.length };
}

function formatDate(val) {
  if (Object.prototype.toString.call(val) === '[object Date]') {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return val;
}
