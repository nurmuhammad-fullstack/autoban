/* ============================================================
   CONFIG
============================================================ */
const API_BASE = 'https://autoban-backend.fly.dev/api';

/* ============================================================
   STATE
============================================================ */
let parts = [];
let models = [];
let sales = [];
let activeFilter = 'ALL';
let todayRevenue = 0;

const THEME_STORAGE_KEY = 'avto-zapchast-theme';
const THEME_LIGHT = 'light';
const THEME_DARK = 'dark';

/* ============================================================
   API HELPERS
============================================================ */
async function apiFetch(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Server xatosi');
  return data;
}

/* ============================================================
   THEME
============================================================ */
function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === THEME_LIGHT || stored === THEME_DARK) return stored;
  } catch (e) {}
  return null;
}
function writeStoredTheme(theme) {
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch (e) {}
}
function getSystemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? THEME_DARK : THEME_LIGHT;
}
function syncThemeToggle(theme) {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const isDark = theme === THEME_DARK;
  btn.setAttribute('aria-pressed', String(isDark));
  btn.setAttribute('aria-label', isDark ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish");
  btn.setAttribute('title', isDark ? "Yorug' rejim" : "Qorong'i rejim");
}
function applyTheme(theme) {
  const next = theme === THEME_DARK ? THEME_DARK : THEME_LIGHT;
  document.documentElement.setAttribute('data-theme', next);
  syncThemeToggle(next);
  return next;
}
function initTheme() {
  const stored = readStoredTheme();
  applyTheme(stored || getSystemTheme());
  if (stored || !window.matchMedia) return;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = (e) => { if (!readStoredTheme()) applyTheme(e.matches ? THEME_DARK : THEME_LIGHT); };
  media.addEventListener?.('change', onChange) || media.addListener?.(onChange);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === THEME_DARK ? THEME_DARK : THEME_LIGHT;
  const next = current === THEME_DARK ? THEME_LIGHT : THEME_DARK;
  applyTheme(next);
  writeStoredTheme(next);
}

/* ============================================================
   NAVIGATION
============================================================ */
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const next = document.getElementById('page-' + page);
  if (next) next.classList.remove('hidden');
  document.querySelectorAll('[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  if (page === 'dashboard') loadDashboard();
  if (page === 'inventory') loadInventory();
  if (page === 'models')    loadModels();
  if (page === 'sales')     loadSales();
}
function focusSearch() {
  navigate('inventory');
  setTimeout(() => document.getElementById('search-input')?.focus(), 0);
}

/* ============================================================
   MODAL
============================================================ */
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}
function closeModalIf(e) {
  if (e.target.classList.contains('modal-backdrop')) {
    e.currentTarget.classList.remove('open');
    document.body.style.overflow = '';
  }
}
function openAddModal() {
  document.getElementById('add-name').value = '';
  document.getElementById('add-code').value = '';
  document.getElementById('add-stock').value = '';
  document.getElementById('add-price').value = '';
  refreshModelDatalist();
  document.getElementById('add-model').value = activeFilter !== 'ALL' ? activeFilter : (models[0]?.name || '');
  openModal('add-modal');
}

/* ============================================================
   TOAST
============================================================ */
function showToast(msg, color) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.setProperty('--toast-accent', color || '#1d7a5d');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

/* ============================================================
   HELPERS
============================================================ */
function normalizeModelName(m) { return String(m || '').trim().replace(/\s+/g, ' '); }
function modelKey(m) { return normalizeModelName(m).toUpperCase(); }
function badgeClass(model) {
  const map = { 'ID.4': 'badge-id4', 'ID.6': 'badge-id6', 'C11': 'badge-c11', 'L9': 'badge-l9' };
  return map[modelKey(model)] || 'badge-generic';
}
function stockColor(stock) {
  if (stock === 0) return '#6b7280';
  if (stock <= 2)  return '#f87171';
  if (stock <= 5)  return '#fbbf24';
  return '#a3e635';
}
function stockPct(stock) { return Math.min(100, (stock / 20) * 100); }
function fmtPrice(p) { return '$' + Number(p).toLocaleString('en-US', { minimumFractionDigits: 0 }); }

function refreshModelDatalist() {
  const list = document.getElementById('model-list');
  if (!list) return;
  list.innerHTML = '';
  models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.name || m;
    list.appendChild(opt);
  });
}

/* ============================================================
   DASHBOARD
============================================================ */
async function loadDashboard() {
  try {
    const d = await apiFetch('/dashboard');
    todayRevenue = d.revenue;

    document.getElementById('stat-total').textContent    = d.total;
    document.getElementById('stat-lowstock').textContent = d.low_stock;
    document.getElementById('stat-revenue').textContent  = fmtPrice(d.revenue);
    document.getElementById('stat-tx').textContent       = d.tx_count;
    const rm = document.getElementById('stat-revenue-main');
    if (rm) rm.textContent = fmtPrice(d.revenue);
    document.getElementById('tx-count').textContent = d.tx_count + ' ta tranzaksiya';

    const alertList  = document.getElementById('alert-list');
    const alertEmpty = document.getElementById('alert-empty');
    if (d.alerts.length > 0) {
      alertList.innerHTML = d.alerts.map(p => `
        <div class="alert-row">
          <div class="alert-left">
            <div class="row-title">${p.name}</div>
            <div class="row-meta">${p.code} · <span class="model-badge ${badgeClass(p.model)}">${p.model}</span></div>
          </div>
          <div class="alert-right">
            <div class="alert-stock">${p.stock}</div>
            <div class="alert-sub">qoldi</div>
          </div>
        </div>
      `).join('');
      alertEmpty?.classList.add('hidden');
    } else {
      alertList.innerHTML = '';
      alertEmpty?.classList.remove('hidden');
    }

    const salesLog = document.getElementById('recent-sales-list');
    if (d.recent_sales.length === 0) {
      salesLog.innerHTML = '<div class="empty-state">Hali tranzaksiya yo\'q</div>';
    } else {
      salesLog.innerHTML = d.recent_sales.map(s => `
        <div class="tx-row">
          <div class="tx-left">
            <div class="row-title">${s.name}</div>
            <div class="row-meta">${s.time} · <span class="model-badge ${badgeClass(s.model)}">${s.model}</span></div>
          </div>
          <div class="row-amount">${fmtPrice(s.price)}</div>
        </div>
      `).join('');
    }
  } catch (err) {
    showToast('Dashboard yuklanmadi: ' + err.message, '#e11d48');
  }
}

/* ============================================================
   INVENTORY
============================================================ */
function applyActiveFilterClass() {
  document.querySelectorAll('.filter-btn').forEach(b => {
    const isActive = activeFilter === 'ALL'
      ? b.dataset.filter === 'ALL'
      : modelKey(b.dataset.filter) === modelKey(activeFilter);
    b.classList.toggle('active', isActive);
  });
}
function createFilterButton(val, label) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'filter-btn';
  btn.dataset.filter = val;
  btn.textContent = label || val;
  btn.addEventListener('click', () => setFilter(val));
  return btn;
}
function renderFilterButtons() {
  const row = document.getElementById('filter-row');
  if (!row) return;
  if (activeFilter !== 'ALL' && !models.some(m => modelKey(m.name || m) === modelKey(activeFilter))) {
    activeFilter = 'ALL';
  }
  row.innerHTML = '';
  row.appendChild(createFilterButton('ALL', 'BARCHASI'));
  models.forEach(m => row.appendChild(createFilterButton(m.name || m)));
  applyActiveFilterClass();
}
function setFilter(val) {
  activeFilter = val === 'ALL' ? 'ALL' : normalizeModelName(val);
  applyActiveFilterClass();
  renderInventory();
}

async function loadInventory() {
  try {
    parts = await apiFetch('/parts');
    renderFilterButtons();
    refreshModelDatalist();
    renderInventory();
  } catch (err) {
    showToast('Ombor yuklanmadi: ' + err.message, '#e11d48');
  }
}

function renderInventory() {
  const q = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
  const list = parts.filter(p => {
    const matchF = activeFilter === 'ALL' || modelKey(p.model) === modelKey(activeFilter);
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.model.toLowerCase().includes(q);
    return matchF && matchQ;
  });

  document.getElementById('inv-count-label').textContent = list.length + ' ta ehtiyot qism';
  const container = document.getElementById('parts-list');
  const empty = document.getElementById('parts-empty');

  if (list.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  container.innerHTML = list.map(p => {
    const sc = stockColor(p.stock);
    const sp = stockPct(p.stock);
    return `
    <div class="part-row" id="row-${p.id}">
      <div class="flex items-start justify-between mb-2">
        <div style="flex:1;min-width:0">
          <div class="row-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
          <div class="flex items-center gap-2">
            <span class="model-badge ${badgeClass(p.model)}">${p.model}</span>
            <span class="row-meta font-mono">${p.code}</span>
          </div>
        </div>
        <div class="text-right ml-3 flex-shrink-0">
          <div class="row-amount">${fmtPrice(p.price)}</div>
        </div>
      </div>
      <div class="flex items-center gap-3 mb-3">
        <div style="flex:1">
          <div class="stock-bar-wrap">
            <div class="stock-bar-fill" style="width:${sp}%;background:${sc}"></div>
          </div>
        </div>
        <div class="font-mono text-xs font-700" style="color:${sc};min-width:48px;text-align:right">${p.stock} ta</div>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn-arc" onclick="openEdit(${p.id})">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-1px;margin-right:4px"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          TAHRIR
        </button>
        <button class="btn-volt" onclick="sellOne(${p.id})" ${p.stock === 0 ? 'disabled' : ''}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:-1px;margin-right:4px"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.97-1.67l1.38-7.33H6"/></svg>
          SOTISH
        </button>
        <button class="btn-danger" onclick="deletePart(${p.id})" style="margin-left:auto">
          O'CHIRISH
        </button>
        ${p.stock < 3 ? `<span class="pill pill-danger">⚠ KAM</span>` : ''}
      </div>
    </div>
    `;
  }).join('');
}

/* ============================================================
   MODELS
============================================================ */
async function loadModels() {
  try {
    models = await apiFetch('/models');
    renderFilterButtons();
    refreshModelDatalist();
    renderModels();
  } catch (err) {
    showToast('Modellar yuklanmadi: ' + err.message, '#e11d48');
  }
}

function renderModels() {
  const container = document.getElementById('models-list');
  const empty = document.getElementById('models-empty');
  const countLabel = document.getElementById('models-count-label');
  if (!container || !empty || !countLabel) return;

  countLabel.textContent = models.length + ' ta model';
  container.innerHTML = '';

  if (models.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  models.forEach(model => {
    const row = document.createElement('div');
    row.className = 'part-row flex items-center justify-between';

    const left = document.createElement('div');
    left.style.minWidth = '0';
    const top = document.createElement('div');
    top.className = 'flex items-center gap-2';

    const badge = document.createElement('span');
    badge.className = `model-badge ${badgeClass(model.name)}`;
    badge.textContent = model.name;
    top.appendChild(badge);

    const meta = document.createElement('span');
    meta.className = 'font-mono text-xs text-gray-600';
    meta.textContent = `${model.parts_count} ta ehtiyot qism`;
    top.appendChild(meta);
    left.appendChild(top);

    const actions = document.createElement('div');
    actions.className = 'flex items-center gap-2 flex-shrink-0 ml-3';

    const renameBtn = document.createElement('button');
    renameBtn.type = 'button';
    renameBtn.className = 'btn-arc';
    renameBtn.textContent = "NOMINI O'ZG.";
    renameBtn.addEventListener('click', () => openModelEdit(model));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-danger';
    deleteBtn.textContent = "O'CHIRISH";
    if (model.parts_count > 0) {
      deleteBtn.disabled = true;
      deleteBtn.style.opacity = '0.4';
      deleteBtn.style.cursor = 'not-allowed';
    } else {
      deleteBtn.addEventListener('click', () => deleteModel(model));
    }

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);
    row.appendChild(left);
    row.appendChild(actions);
    container.appendChild(row);
  });
}

async function addModel() {
  const input = document.getElementById('model-add-input');
  if (!input) return;
  const name = normalizeModelName(input.value);
  if (!name) { showToast('Model nomi kerak', '#e11d48'); return; }

  try {
    await apiFetch('/models', { method: 'POST', body: JSON.stringify({ name }) });
    input.value = '';
    showToast("Model qo'shildi", '#1d7a5d');
    await loadModels();
  } catch (err) {
    showToast(err.message, '#e11d48');
  }
}

function openModelEdit(model) {
  document.getElementById('model-old').value = model.id;
  document.getElementById('model-new').value = model.name;
  openModal('model-edit-modal');
  setTimeout(() => document.getElementById('model-new').focus(), 0);
}

async function saveModelEdit() {
  const id   = document.getElementById('model-old').value;
  const name = normalizeModelName(document.getElementById('model-new').value);
  if (!name) { showToast('Model nomi kerak', '#e11d48'); return; }

  try {
    await apiFetch(`/models/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
    closeModal('model-edit-modal');
    showToast('Model yangilandi');
    await loadModels();
    await loadInventory();
    await loadDashboard();
  } catch (err) {
    showToast(err.message, '#e11d48');
  }
}

async function deleteModel(model) {
  if (!confirm(`Model "${model.name}" o'chirilsinmi?`)) return;
  try {
    await apiFetch(`/models/${model.id}`, { method: 'DELETE' });
    showToast("Model o'chirildi", '#1d7a5d');
    await loadModels();
  } catch (err) {
    showToast(err.message, '#e11d48');
  }
}

/* ============================================================
   SELL
============================================================ */
async function sellOne(id) {
  try {
    await apiFetch(`/parts/${id}/sell`, { method: 'POST' });
    showToast('Sotildi!', '#1d7a5d');
    await loadInventory();
    await loadDashboard();
  } catch (err) {
    showToast(err.message, '#e11d48');
  }
}

/* ============================================================
   ADD PART
============================================================ */
async function savePart() {
  const name  = document.getElementById('add-name').value.trim();
  const code  = document.getElementById('add-code').value.trim();
  const model = normalizeModelName(document.getElementById('add-model').value);
  const stock = parseInt(document.getElementById('add-stock').value) || 0;
  const price = parseFloat(document.getElementById('add-price').value) || 0;

  if (!name)  { showToast('Ehtiyot qism nomi kerak', '#e11d48'); return; }
  if (!model) { showToast('Avtomobil modeli kerak', '#e11d48'); return; }

  try {
    await apiFetch('/parts', { method: 'POST', body: JSON.stringify({ name, code, model, stock, price }) });
    closeModal('add-modal');
    showToast("Qo'shildi: " + name);
    await loadInventory();
    await loadDashboard();
  } catch (err) {
    showToast(err.message, '#e11d48');
  }
}

/* ============================================================
   EDIT PART
============================================================ */
function openEdit(id) {
  const p = parts.find(x => x.id === id);
  if (!p) return;
  document.getElementById('edit-id').value    = id;
  document.getElementById('edit-name').value  = p.name;
  document.getElementById('edit-code').value  = p.code;
  document.getElementById('edit-model').value = p.model;
  document.getElementById('edit-stock').value = p.stock;
  document.getElementById('edit-price').value = p.price;
  refreshModelDatalist();
  openModal('edit-modal');
}

async function updatePart() {
  const id    = parseInt(document.getElementById('edit-id').value);
  const name  = document.getElementById('edit-name').value.trim();
  const code  = document.getElementById('edit-code').value.trim();
  const model = normalizeModelName(document.getElementById('edit-model').value);
  const stock = parseInt(document.getElementById('edit-stock').value) || 0;
  const price = parseFloat(document.getElementById('edit-price').value) || 0;

  try {
    await apiFetch(`/parts/${id}`, { method: 'PUT', body: JSON.stringify({ name, code, model, stock, price }) });
    closeModal('edit-modal');
    showToast('Yangilandi: ' + name);
    await loadInventory();
    await loadDashboard();
  } catch (err) {
    showToast(err.message, '#e11d48');
  }
}

async function deletePart(id) {
  const p = parts.find(x => x.id === id);
  if (!confirm(`"${p?.name}" o'chirilsinmi?`)) return;
  try {
    await apiFetch(`/parts/${id}`, { method: 'DELETE' });
    showToast("O'chirildi", '#1d7a5d');
    await loadInventory();
    await loadDashboard();
  } catch (err) {
    showToast(err.message, '#e11d48');
  }
}

/* ============================================================
   SALES PAGE
============================================================ */
async function loadSales() {
  try {
    const salesData = await apiFetch('/sales');
    const container = document.getElementById('sales-log-full');
    const empty = document.getElementById('sales-empty');

    if (salesData.length === 0) {
      container.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    container.innerHTML = `
      <div class="card sales-summary">
        <div class="sales-kpis">
          <div>
            <div class="kpi-label">Bugungi tushum</div>
            <div class="kpi-value">${fmtPrice(todayRevenue)}</div>
          </div>
          <div class="kpi-right">
            <div class="kpi-label">Jami tranzaksiyalar</div>
            <div class="kpi-value">${salesData.length}</div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-head-title">Barcha tranzaksiyalar</div>
            <div class="card-head-sub">${salesData.length} ta yozuv</div>
          </div>
        </div>
        <div class="list-rows">
          ${salesData.map(s => `
          <div class="tx-row">
            <div class="tx-left">
              <div class="row-title">${s.part_name}</div>
              <div class="row-meta">${s.time} · <span class="model-badge ${badgeClass(s.model_name)}">${s.model_name}</span></div>
            </div>
            <div class="row-amount">${fmtPrice(s.price)}</div>
          </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    showToast('Sotuvlar yuklanmadi: ' + err.message, '#e11d48');
  }
}

/* ============================================================
   INIT
============================================================ */
initTheme();

async function init() {
  try {
    [models, parts] = await Promise.all([
      apiFetch('/models'),
      apiFetch('/parts'),
    ]);
    refreshModelDatalist();
    renderFilterButtons();
    renderInventory();
  } catch (e) {
    showToast('Backend ulanmadi. Server ishlaydimi?', '#e11d48');
    return;
  }
  await loadDashboard();
}

init();
