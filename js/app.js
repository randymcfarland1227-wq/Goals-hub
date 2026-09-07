const state = {
  zoom: 1,
  listActiveCats: new Set(CATEGORIES.map(c => c.id)),
  reviews: [],
  reviewAnswers: {}, // effortId -> { momentum, notes }
  reviewOpenCats: new Set(),
};

const ZOOM_MIN = 0.7, ZOOM_MAX = 1.6, ZOOM_STEP = 0.1, ZOOM_BASE = 380;
const MOMENTUM_VALUES = ['On Track', 'Slipping', 'Stalled'];

const connected = () => !!APPS_SCRIPT_URL;

function momentumSlug(v) { return (v || '').toLowerCase().replace(/\s+/g, '-'); }
function categoryMeta(id) { return CATEGORIES.find(c => c.id === id); }
function catBySlugOrLabel(v) { return CATEGORIES.find(c => c.id === v || c.label === v); }

document.getElementById('sheetLinkHeader').href = GOALS_SHEET_URL;
document.getElementById('sheetLinkReview').href = GOALS_SHEET_URL;
document.getElementById('todayLabel').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

// ---------------------------------------------------------------------
// Vision / dream board
// ---------------------------------------------------------------------
document.getElementById('visionSubtitle').textContent = VISION.subtitle;
document.getElementById('visionTitle').textContent = VISION.title;

function renderDreamGrid() {
  document.getElementById('dreamGrid').innerHTML = VISION.dreams.map(d => `
    <div class="dream-card">
      <div class="dream-top">
        <span class="dream-icon-badge"><span class="dream-icon">${d.icon}</span></span>
        <h3>${d.dream}</h3>
      </div>
      <p class="details">${d.details}</p>
      <div class="how"><b>How</b> ${d.how}</div>
    </div>
  `).join('');
}
renderDreamGrid();

// ---------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------
function activateTab(view) {
  document.querySelectorAll('nav.tabs button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === view));
}
document.querySelectorAll('nav.tabs button').forEach(btn => {
  btn.addEventListener('click', () => activateTab(btn.dataset.view));
});
document.querySelectorAll('[data-view-link]').forEach(btn => {
  btn.addEventListener('click', () => activateTab(btn.dataset.viewLink));
});

// ---------------------------------------------------------------------
// Review schedule (shared banner logic)
// ---------------------------------------------------------------------
function reviewSchedule() {
  const anchor = new Date(REVIEW_ANCHOR_DATE + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(anchor);
  while (due < today) due.setDate(due.getDate() + REVIEW_INTERVAL_DAYS);
  const daysUntil = Math.round((due - today) / 86400000);
  return { due, daysUntil };
}

function renderReviewBanners() {
  const { due, daysUntil } = reviewSchedule();
  const dateLabel = due.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  let headline, sub;
  if (daysUntil === 0) { headline = 'Today is a review day'; sub = dateLabel; }
  else if (daysUntil === 1) { headline = 'Next review: tomorrow'; sub = dateLabel; }
  else { headline = `Next review: ${dateLabel}`; sub = `in ${daysUntil} days`; }

  document.getElementById('reviewBannerText').innerHTML = `${headline}<span class="sub">${sub}</span>`;
  document.getElementById('reviewBannerText2').innerHTML = `${headline}<span class="sub">${sub}</span>`;
  document.getElementById('reviewBanner').classList.toggle('due-today', daysUntil === 0);
  document.getElementById('reviewBanner2').classList.toggle('due-today', daysUntil === 0);
}

// ---------------------------------------------------------------------
// Momentum lookups — derived from saved reviews
// ---------------------------------------------------------------------
function latestMomentumByEffort() {
  const map = {};
  state.reviews.forEach((r, i) => {
    const key = r.effortId;
    if (!key) return;
    const existing = map[key];
    if (!existing || (r.date || '') > (existing.date || '') || ((r.date || '') === (existing.date || '') && i > existing._i)) {
      map[key] = { ...r, _i: i };
    }
  });
  return map;
}

function categoryMomentumStats(catId, latestMap) {
  const items = EFFORTS.filter(e => e.category === catId);
  const reviewed = items.map(e => latestMap[e.id]).filter(Boolean);
  if (!reviewed.length) return { reviewedCount: 0, total: items.length, cls: 'm-none' };
  const onTrack = reviewed.filter(r => r.momentum === 'On Track').length;
  const score = reviewed.reduce((s, r) => s + (r.momentum === 'On Track' ? 1 : r.momentum === 'Slipping' ? 0.5 : 0), 0) / reviewed.length;
  const cls = score >= 0.75 ? 'm-on-track' : score >= 0.4 ? 'm-slipping' : 'm-stalled';
  return { reviewedCount: reviewed.length, onTrack, total: items.length, cls };
}

function overallMomentumStats(latestMap) {
  const reviewed = EFFORTS.map(e => latestMap[e.id]).filter(Boolean);
  if (!reviewed.length) return null;
  const onTrack = reviewed.filter(r => r.momentum === 'On Track').length;
  return { pct: Math.round((onTrack / reviewed.length) * 100), reviewedCount: reviewed.length, total: EFFORTS.length };
}

function renderStatRow() {
  const latestMap = latestMomentumByEffort();
  const overall = overallMomentumStats(latestMap);
  const { daysUntil } = reviewSchedule();
  const reviewedCount = Object.keys(latestMap).length;

  const stats = [
    { label: 'Present focuses', value: EFFORTS.length },
    { label: 'Categories', value: CATEGORIES.length },
    { label: 'On track (latest)', value: overall ? `${overall.pct}%` : '—', sub: overall ? `${overall.reviewedCount} of ${EFFORTS.length} reviewed` : 'no reviews yet' },
    { label: 'Next review', value: daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`, sub: reviewedCount ? `${state.reviews.length ? new Set(state.reviews.map(r => r.date)).size : 0} reviews logged` : 'first review pending' },
  ];

  document.getElementById('statRow').innerHTML = stats.map(s => `
    <div class="stat-tile">
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
      ${s.sub ? `<div class="stat-sub">${s.sub}</div>` : ''}
    </div>
  `).join('');
}

function relativeDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const days = Math.round((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days > 1 && days < 30) return `${days}d ago`;
  return dateStr;
}

// ---------------------------------------------------------------------
// Effort cards
// ---------------------------------------------------------------------
function effortCardHTML(effort, latestMap) {
  const latest = latestMap[effort.id];
  const badgeCls = latest ? `m-${momentumSlug(latest.momentum)}` : 'm-none';
  const badgeText = latest ? latest.momentum : 'Not yet reviewed';
  return `
    <div class="card">
      <div class="card-top">
        <h3>${effort.effort}</h3>
        <span class="momentum-badge ${badgeCls}">${badgeText}</span>
      </div>
      <p class="why">${effort.reason}</p>
      <div class="meta">
        <span><b>How —</b> ${effort.how}</span>
      </div>
      ${latest && latest.notes ? `<div class="last-note"><b>${relativeDate(latest.date)}</b> — ${latest.notes}</div>` : ''}
    </div>
  `;
}

// ---------------------------------------------------------------------
// Overview mode switch — wheel vs full list
// ---------------------------------------------------------------------
document.querySelectorAll('#modeSwitch button').forEach(btn => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode, true));
});

function setMode(mode, resetHash) {
  document.querySelectorAll('#modeSwitch button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  document.getElementById('wheelMode').style.display = mode === 'wheel' ? '' : 'none';
  document.getElementById('listMode').style.display = mode === 'list' ? '' : 'none';
  localSet('goalsHub.mode', mode);
  if (mode === 'wheel' && resetHash) location.hash = '';
}

// ---------------------------------------------------------------------
// Overview — wheel of categories, drilling into one at a time
// ---------------------------------------------------------------------
function renderWheel() {
  const latestMap = latestMomentumByEffort();
  const nodesEl = document.getElementById('wheelNodes');
  const spokesEl = document.getElementById('wheelSpokes');
  nodesEl.innerHTML = '';
  spokesEl.innerHTML = '';

  const n = CATEGORIES.length;
  const R = 38;
  const cx = 50, cy = 50;

  CATEGORIES.forEach((cat, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const x = cx + R * Math.cos(angle);
    const y = cy + R * Math.sin(angle);
    const stats = categoryMomentumStats(cat.id, latestMap);

    const spoke = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    spoke.setAttribute('x1', cx); spoke.setAttribute('y1', cy);
    spoke.setAttribute('x2', x); spoke.setAttribute('y2', y);
    spoke.setAttribute('class', 'spoke-line');
    spokesEl.appendChild(spoke);

    const node = document.createElement('button');
    node.className = 'wheel-node';
    node.style.left = x + '%';
    node.style.top = y + '%';
    node.style.setProperty('--dot', `var(--c-${cat.id})`);
    const countText = stats.reviewedCount ? `${stats.onTrack}/${stats.reviewedCount} on track` : `${stats.total} focuses`;
    node.innerHTML = `
      <span class="bubble ${stats.cls}">${cat.icon}</span>
      <span class="label">${cat.label}</span>
      <span class="count">${countText}</span>
    `;
    node.addEventListener('click', () => { location.hash = `#/category/${cat.id}`; });
    nodesEl.appendChild(node);
  });

  const overall = overallMomentumStats(latestMap);
  if (overall) {
    document.getElementById('wheelCount').textContent = overall.pct + '%';
    document.getElementById('wheelCountLabel').textContent = 'on track (latest)';
  } else {
    document.getElementById('wheelCount').textContent = EFFORTS.length;
    document.getElementById('wheelCountLabel').textContent = 'present focuses';
  }
}

// ---------------------------------------------------------------------
// Wheel zoom
// ---------------------------------------------------------------------
function applyZoom() {
  const wrap = document.getElementById('wheelWrap');
  const scroll = document.getElementById('wheelScroll');
  const base = Math.min(scroll.clientWidth, ZOOM_BASE);
  const px = Math.round(base * state.zoom);
  wrap.style.width = px + 'px';
  document.getElementById('zoomPct').textContent = Math.round(state.zoom * 100) + '%';
  document.getElementById('zoomOut').disabled = state.zoom <= ZOOM_MIN;
  document.getElementById('zoomIn').disabled = state.zoom >= ZOOM_MAX;
  void wrap.offsetWidth;
  scroll.scrollLeft = (px - scroll.clientWidth) / 2;
}

document.getElementById('zoomIn').addEventListener('click', () => {
  state.zoom = Math.min(ZOOM_MAX, +(state.zoom + ZOOM_STEP).toFixed(2));
  applyZoom();
});
document.getElementById('zoomOut').addEventListener('click', () => {
  state.zoom = Math.max(ZOOM_MIN, +(state.zoom - ZOOM_STEP).toFixed(2));
  applyZoom();
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(applyZoom, 150);
});

function showWheel() {
  document.getElementById('wheelView').style.display = '';
  document.getElementById('categoryView').style.display = 'none';
}

function showCategory(catId) {
  const cat = CATEGORIES.find(c => c.id === catId);
  if (!cat) { showWheel(); return; }

  document.getElementById('wheelView').style.display = 'none';
  const view = document.getElementById('categoryView');
  view.style.display = '';
  view.style.setProperty('--cat', `var(--c-${cat.id})`);

  document.getElementById('catIcon').textContent = cat.icon;
  document.getElementById('catLabel').textContent = cat.label;
  document.getElementById('catBlurb').textContent = cat.headline;

  renderCategoryCards(cat);
}

function renderCategoryCards(cat) {
  const grid = document.getElementById('categoryCards');
  const latestMap = latestMomentumByEffort();
  const items = EFFORTS.filter(e => e.category === cat.id);
  grid.innerHTML = items.map(e => effortCardHTML(e, latestMap)).join('');
}

document.getElementById('backToWheel').addEventListener('click', () => { location.hash = ''; });

function routeOverview() {
  const match = location.hash.match(/^#\/category\/(.+)$/);
  if (match) showCategory(match[1]); else showWheel();
}
window.addEventListener('hashchange', routeOverview);

// ---------------------------------------------------------------------
// Overview — List mode (every category, stacked, filterable)
// ---------------------------------------------------------------------
function renderListChips() {
  const row = document.getElementById('chipRow');
  row.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const chip = document.createElement('div');
    chip.className = 'chip active';
    chip.style.setProperty('--dot', `var(--c-${cat.id})`);
    chip.innerHTML = `<span class="dot"></span>${cat.icon} ${cat.label}`;
    chip.addEventListener('click', () => {
      if (state.listActiveCats.has(cat.id)) { state.listActiveCats.delete(cat.id); chip.classList.remove('active'); }
      else { state.listActiveCats.add(cat.id); chip.classList.add('active'); }
      renderList();
    });
    row.appendChild(chip);
  });
}

function renderList() {
  const container = document.getElementById('catSections');
  container.innerHTML = '';
  const latestMap = latestMomentumByEffort();

  CATEGORIES.filter(c => state.listActiveCats.has(c.id)).forEach(cat => {
    const items = EFFORTS.filter(e => e.category === cat.id);

    const section = document.createElement('div');
    section.className = 'cat-section';
    section.style.setProperty('--cat', `var(--c-${cat.id})`);

    section.innerHTML = `
      <div class="cat-heading">
        <span class="icon">${cat.icon}</span>
        <h2>${cat.label}</h2>
        <span class="count">${items.length}</span>
      </div>
      <p class="cat-blurb">${cat.headline}</p>
      ${items.length ? `<div class="card-grid">${items.map(e => effortCardHTML(e, latestMap)).join('')}</div>` : '<div class="empty-state">Nothing here yet.</div>'}
    `;

    container.appendChild(section);
  });
}

// ---------------------------------------------------------------------
// Backend helper (Apps Script Web App, or localStorage fallback)
// ---------------------------------------------------------------------
async function apiGet(action) {
  if (!connected()) return null;
  const res = await fetch(`${APPS_SCRIPT_URL}?action=${action}`);
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

async function apiPost(action, payload) {
  if (!connected()) return null;
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

function localGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}
function localSet(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

// ---------------------------------------------------------------------
// Bi-Weekly Review — one card per present focus, grouped into a
// collapsible accordion by category.
// ---------------------------------------------------------------------
function ensureReviewAnswer(id) {
  state.reviewAnswers[id] = state.reviewAnswers[id] || { momentum: '', notes: '' };
  return state.reviewAnswers[id];
}

function updateReviewProgress() {
  const done = EFFORTS.filter(e => state.reviewAnswers[e.id] && state.reviewAnswers[e.id].momentum).length;
  const pct = EFFORTS.length ? Math.round((done / EFFORTS.length) * 100) : 0;
  document.getElementById('reviewProgressFill').style.width = pct + '%';
  document.getElementById('reviewProgressLabel').textContent = `${done} of ${EFFORTS.length} reviewed`;
}

function cssEscape(s) { return String(s).replace(/"/g, '\\"'); }

function reviewItemHTML(e) {
  const ans = ensureReviewAnswer(e.id);
  return `
    <div class="review-item" data-effort-id="${e.id}">
      <div class="review-item-top">
        <span class="review-item-title">${e.effort}</span>
        <div class="momentum-row">
          ${MOMENTUM_VALUES.map(v => `<button data-val="${v}">${v}</button>`).join('')}
        </div>
      </div>
      <p class="why-remind">Reminder — ${e.reason}</p>
      <input class="review-notes-input" type="text" placeholder="What's getting in the way, or working well? (optional)" value="${(ans.notes || '').replace(/"/g, '&quot;')}">
    </div>
  `;
}

function renderReviewForm() {
  const form = document.getElementById('reviewForm');
  form.innerHTML = '';

  CATEGORIES.forEach(cat => {
    const items = EFFORTS.filter(e => e.category === cat.id);
    if (!items.length) return;
    const doneCount = items.filter(e => state.reviewAnswers[e.id] && state.reviewAnswers[e.id].momentum).length;
    const open = state.reviewOpenCats.has(cat.id);

    const section = document.createElement('div');
    section.className = 'review-accordion' + (open ? ' open' : '');
    section.style.setProperty('--cat', `var(--c-${cat.id})`);
    section.innerHTML = `
      <button class="review-accordion-head">
        <span class="icon">${cat.icon}</span>
        <h4>${cat.label}</h4>
        <span class="review-accordion-count">${doneCount}/${items.length}</span>
        <span class="review-accordion-chevron">⌄</span>
      </button>
      <div class="review-accordion-body">
        ${items.map(e => reviewItemHTML(e)).join('')}
      </div>
    `;

    section.querySelector('.review-accordion-head').addEventListener('click', () => {
      if (state.reviewOpenCats.has(cat.id)) state.reviewOpenCats.delete(cat.id);
      else state.reviewOpenCats.add(cat.id);
      renderReviewForm();
    });

    items.forEach(e => {
      const row = section.querySelector(`[data-effort-id="${cssEscape(e.id)}"]`);
      const ans = ensureReviewAnswer(e.id);
      const buttons = row.querySelectorAll('.momentum-row button');
      buttons.forEach(b => {
        if (b.dataset.val === ans.momentum) b.classList.add(`sel-${momentumSlug(b.dataset.val)}`);
        b.addEventListener('click', () => {
          buttons.forEach(x => x.className = '');
          b.classList.add(`sel-${momentumSlug(b.dataset.val)}`);
          ans.momentum = b.dataset.val;
          updateReviewProgress();
        });
      });
      row.querySelector('.review-notes-input').addEventListener('input', ev => { ans.notes = ev.target.value; });
    });

    form.appendChild(section);
  });

  updateReviewProgress();
}

async function loadReviews() {
  document.getElementById('reviewSetupNote').style.display = connected() ? 'none' : 'block';
  if (connected()) {
    try { state.reviews = (await apiGet('reviews')) || []; }
    catch { state.reviews = []; document.getElementById('reviewStatus').textContent = 'Could not reach your Sheet.'; }
  } else {
    state.reviews = localGet('goalsHub.reviews.local', []);
  }
  renderReviewHistory();
  renderWheel();
  routeOverview();
  renderList();
  renderStatRow();
}

function renderReviewHistory() {
  const el = document.getElementById('reviewHistory');
  if (!state.reviews.length) { el.innerHTML = '<div class="empty-state">No reviews saved yet.</div>'; return; }
  const byDate = {};
  state.reviews.forEach(r => { (byDate[r.date] = byDate[r.date] || []).push(r); });
  el.innerHTML = Object.keys(byDate).sort().reverse().map(date => {
    const entries = byDate[date];
    const counts = { 'On Track': 0, 'Slipping': 0, 'Stalled': 0 };
    entries.forEach(r => { if (counts[r.momentum] !== undefined) counts[r.momentum]++; });
    return `
    <div class="review-session">
      <div class="review-session-head">
        <span class="rdate">${date}</span>
        <span class="review-session-summary">${counts['On Track']} on track · ${counts['Slipping']} slipping · ${counts['Stalled']} stalled</span>
      </div>
      ${entries.map(r => `
        <div class="review-entry" style="--cat:var(--c-${(catBySlugOrLabel(r.category) || {}).id || 'physical'})">
          <span class="rcat">${r.effort || r.category} <span class="momentum-badge m-${momentumSlug(r.momentum)}">${r.momentum || '—'}</span></span>
          ${r.notes ? `<p>${r.notes}</p>` : ''}
        </div>
      `).join('')}
    </div>
  `;
  }).join('');
}

async function saveReview() {
  const status = document.getElementById('reviewStatus');
  const date = new Date().toISOString().slice(0, 10);
  const rows = EFFORTS.map(e => {
    const ans = state.reviewAnswers[e.id] || {};
    const cat = categoryMeta(e.category);
    return { date, category: cat.label, categoryId: cat.id, effortId: e.id, effort: e.effort, momentum: ans.momentum || '', notes: ans.notes || '' };
  }).filter(r => r.momentum || r.notes);

  if (!rows.length) { status.textContent = 'Nothing to save yet — mark at least one focus.'; return; }
  status.textContent = 'Saving...';

  if (connected()) {
    try { await apiPost('addReviewBatch', { rows }); }
    catch { status.textContent = 'Could not save to your Sheet.'; return; }
  } else {
    const existing = localGet('goalsHub.reviews.local', []);
    localSet('goalsHub.reviews.local', existing.concat(rows));
  }

  status.textContent = `Saved ${rows.length} focus review${rows.length === 1 ? '' : 's'}.`;
  state.reviewAnswers = {};
  state.reviewOpenCats = new Set();
  renderReviewForm();
  loadReviews();
  setTimeout(() => status.textContent = '', 3000);
}

document.getElementById('saveReviewBtn').addEventListener('click', saveReview);

// ---------------------------------------------------------------------
// Vision + Present Focus content — read live from the "Dreams" and
// "Efforts" tabs on the Sheet (auto-seeded once from the defaults
// above, then those tabs become the source of truth). Falls back to
// the built-in defaults above if not connected or the Sheet can't be
// reached.
// ---------------------------------------------------------------------
async function loadGoalsData() {
  if (!connected()) return;
  try {
    let dreams = await apiGet('dreams') || [];
    if (!dreams.length) {
      await apiPost('seedDreams', { rows: VISION.dreams });
      dreams = await apiGet('dreams') || [];
    }
    if (dreams.length) VISION.dreams = dreams;

    let efforts = await apiGet('efforts') || [];
    if (!efforts.length) {
      await apiPost('seedEfforts', { rows: EFFORTS });
      efforts = await apiGet('efforts') || [];
    }
    if (efforts.length) EFFORTS.splice(0, EFFORTS.length, ...efforts);
  } catch {
    // Sheet unreachable — keep the built-in defaults from data.js.
  }
}

// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------
renderWheel();
applyZoom();
routeOverview();
renderListChips();
renderList();
setMode(localGet('goalsHub.mode', 'wheel'));
renderReviewForm();
renderReviewBanners();
renderStatRow();
loadReviews();

loadGoalsData().then(() => {
  renderDreamGrid();
  renderWheel();
  routeOverview();
  renderList();
  renderReviewForm();
  renderStatRow();
});
