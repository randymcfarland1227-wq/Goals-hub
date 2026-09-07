/**
 * Backend for the Goals Hub site. Paste this into Extensions > Apps Script on the
 * "Life and Present Goals" spreadsheet, then deploy as a Web App (see SETUP.md).
 *
 * Endpoints (all on the same Web App URL):
 *   GET  ?action=reviews  -> [{date, category, categoryId, effortId, effort, momentum, notes}]
 *   GET  ?action=dreams   -> [{id, icon, dream, details, how}]
 *   GET  ?action=efforts  -> [{id, category, effort, reason, how}]
 *   POST {action:'addReviewBatch', rows:[{date, category, categoryId, effortId, effort, momentum, notes}, ...]}
 *   POST {action:'seedDreams', rows:[...]}  -> only runs if the Dreams tab is still empty
 *   POST {action:'seedEfforts', rows:[...]} -> only runs if the Efforts tab is still empty
 *
 * Reviews, Dreams, and Efforts each live in their own auto-created tab, kept
 * separate from your original hand-formatted "Life & Current Focuses" board
 * so nothing there gets touched. Dreams and Efforts are the live source of
 * truth for the site once seeded — edit them directly in those tabs and the
 * site will pick up the change next time it loads.
 */

var REVIEWS_SHEET_NAME = 'Goal Reviews';
var REVIEWS_HEADERS = ['Date', 'Category', 'Category ID', 'Effort ID', 'Effort', 'Momentum', 'Notes'];

var DREAMS_SHEET_NAME = 'Dreams';
var DREAMS_HEADERS = ['ID', 'Icon', 'Dream', 'Details', 'How'];

var EFFORTS_SHEET_NAME = 'Efforts';
var EFFORTS_HEADERS = ['ID', 'Category', 'Effort', 'Reason', 'How'];

function doGet(e) {
  var action = e.parameter.action;
  if (action === 'reviews') return jsonOut(getReviews());
  if (action === 'dreams') return jsonOut(getDreams());
  if (action === 'efforts') return jsonOut(getEfforts());
  return jsonOut({ error: 'unknown action' });
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var action = body.action;
  if (action === 'addReviewBatch') return jsonOut(addReviewBatch(body.rows || []));
  if (action === 'seedDreams') return jsonOut(seedDreams(body.rows || []));
  if (action === 'seedEfforts') return jsonOut(seedEfforts(body.rows || []));
  return jsonOut({ error: 'unknown action' });
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------
// Bi-Weekly Review
// ---------------------------------------------------------------------

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

// ---------------------------------------------------------------------
// Dreams — the long-term vision / dream board. Lives in its own
// auto-created "Dreams" tab, seeded once from the site's built-in
// defaults, then this tab is the source of truth.
// ---------------------------------------------------------------------

function getDreamsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(DREAMS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(DREAMS_SHEET_NAME);
    sheet.appendRow(DREAMS_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getDreams() {
  var sheet = getDreamsSheet();
  var data = sheet.getDataRange().getValues();
  var out = [];
  for (var r = 1; r < data.length; r++) {
    if (!data[r][2]) continue; // no Dream name, skip
    var id = data[r][0];
    if (!id) { id = slugify(data[r][2]); sheet.getRange(r + 1, 1).setValue(id); }
    out.push({ id: id, icon: data[r][1], dream: data[r][2], details: data[r][3], how: data[r][4] });
  }
  return out;
}

function seedDreams(rows) {
  var sheet = getDreamsSheet();
  if (sheet.getLastRow() > 1 || !rows.length) return { ok: true, seeded: 0 };
  var values = rows.map(function (d) {
    return [d.id || slugify(d.dream), d.icon || '', d.dream, d.details || '', d.how || ''];
  });
  sheet.getRange(2, 1, values.length, DREAMS_HEADERS.length).setValues(values);
  return { ok: true, seeded: values.length };
}

// ---------------------------------------------------------------------
// Efforts — the present-focus items reviewed bi-weekly. Lives in its
// own auto-created "Efforts" tab, seeded once from the site's built-in
// defaults, then this tab is the source of truth. Category values
// should match the site's category ids: physical, mental, connection,
// financial, spiritual.
// ---------------------------------------------------------------------

function getEffortsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(EFFORTS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(EFFORTS_SHEET_NAME);
    sheet.appendRow(EFFORTS_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getEfforts() {
  var sheet = getEffortsSheet();
  var data = sheet.getDataRange().getValues();
  var out = [];
  for (var r = 1; r < data.length; r++) {
    if (!data[r][2]) continue; // no Effort name, skip
    var id = data[r][0];
    var category = data[r][1];
    if (!id) { id = category + '-' + slugify(data[r][2]); sheet.getRange(r + 1, 1).setValue(id); }
    out.push({ id: id, category: category, effort: data[r][2], reason: data[r][3], how: data[r][4] });
  }
  return out;
}

function seedEfforts(rows) {
  var sheet = getEffortsSheet();
  if (sheet.getLastRow() > 1 || !rows.length) return { ok: true, seeded: 0 };
  var values = rows.map(function (e) {
    return [e.id || (e.category + '-' + slugify(e.effort)), e.category, e.effort, e.reason || '', e.how || ''];
  });
  sheet.getRange(2, 1, values.length, EFFORTS_HEADERS.length).setValues(values);
  return { ok: true, seeded: values.length };
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '');
}

function formatDate(val) {
  if (Object.prototype.toString.call(val) === '[object Date]') {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return val;
}
