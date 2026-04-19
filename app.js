/* ============================================================
   STATE
============================================================ */
let parts = [
  { id: 1, name: 'Old fara Matrix LED',       code: 'AZ-ID4-001', model: 'ID.4', stock: 2,  price: 450  },
  { id: 2, name: 'L9 asosiy akkumulyator',    code: 'AZ-L9-020',  model: 'L9',   stock: 5,  price: 1200 },
  { id: 3, name: 'C11 old bamper',            code: 'AZ-C11-007', model: 'C11',  stock: 1,  price: 300  },
  { id: 4, name: 'ID.6 orqa ko\'zgu',         code: 'AZ-ID6-033', model: 'ID.6', stock: 10, price: 120  },
];
let models = ['ID.4', 'ID.6', 'C11', 'L9'];
let sales = [];
let nextId = 5;
let activeFilter = 'ALL';
let todayRevenue = 0;
const THEME_STORAGE_KEY = 'avto-zapchast-theme';
const THEME_LIGHT = 'light';
const THEME_DARK = 'dark';

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === THEME_LIGHT || stored === THEME_DARK) return stored;
  } catch (e) {}
  return null;
}

function writeStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {}
}

function getSystemTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return THEME_DARK;
  }
  return THEME_LIGHT;
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
  const nextTheme = theme === THEME_DARK ? THEME_DARK : THEME_LIGHT;
  document.documentElement.setAttribute('data-theme', nextTheme);
  syncThemeToggle(nextTheme);
  return nextTheme;
}

function initTheme() {
  const storedTheme = readStoredTheme();
  applyTheme(storedTheme || getSystemTheme());

  if (storedTheme || !window.matchMedia) return;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = (event) => {
    if (readStoredTheme()) return;
    applyTheme(event.matches ? THEME_DARK : THEME_LIGHT);
  };
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', onChange);
  } else if (typeof media.addListener === 'function') {
    media.addListener(onChange);
  }
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

  if (page === 'dashboard') renderDashboard();
  if (page === 'inventory') renderInventory();
  if (page === 'models') renderModels();
  if (page === 'sales') renderSales();
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
  refreshModelUi();
  const models = getModels();
  document.getElementById('add-model').value = activeFilter !== 'ALL' ? activeFilter : (models[0] || '');
  openModal('add-modal');
}
 
/* ============================================================
   TOAST
============================================================ */
function showToast(msg, color) {
  const t = document.getElementById('toast');
  const accent = color || '#1d7a5d';
  t.textContent = msg;
  t.style.setProperty('--toast-accent', accent);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}
 
/* ============================================================
   HELPERS
============================================================ */
function normalizeModelName(model) {
  return String(model || '').trim().replace(/\s+/g, ' ');
}
function modelKey(model) {
  return normalizeModelName(model).toUpperCase();
}
function getModels() {
  const preferredOrder = ['ID.4', 'ID.6', 'C11', 'L9'];
  const preferredIndex = new Map(preferredOrder.map((m, i) => [modelKey(m), i]));

  const seen = new Set();
  const list = [];
  function pushModel(maybeModel) {
    const m = normalizeModelName(maybeModel);
    if (!m) return;
    const k = modelKey(m);
    if (seen.has(k)) return;
    seen.add(k);
    list.push(m);
  }

  models.forEach(pushModel);
  parts.forEach(p => pushModel(p.model));

  list.sort((a, b) => {
    const ai = preferredIndex.get(modelKey(a));
    const bi = preferredIndex.get(modelKey(b));
    if (ai != null && bi != null) return ai - bi;
    if (ai != null) return -1;
    if (bi != null) return 1;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });

  return list;
}

function badgeClass(model) {
  const map = {
    [modelKey('ID.4')]: 'badge-id4',
    [modelKey('ID.6')]: 'badge-id6',
    [modelKey('C11')]: 'badge-c11',
    [modelKey('L9')]: 'badge-l9',
  };
  return map[modelKey(model)] || 'badge-generic';
}
function stockColor(stock) {
  if (stock === 0) return '#6b7280';
  if (stock <= 2)  return '#f87171';
  if (stock <= 5)  return '#fbbf24';
  return '#a3e635';
}
function stockPct(stock) {
  return Math.min(100, (stock / 20) * 100);
}
function fmtPrice(p) {
  return '$' + Number(p).toLocaleString('en-US', {minimumFractionDigits:0});
}
 
/* ============================================================
   DASHBOARD
============================================================ */
function renderDashboard() {
  const low = parts.filter(p => p.stock < 3);
  document.getElementById('stat-total').textContent = parts.length;
  document.getElementById('stat-lowstock').textContent = low.length;
  document.getElementById('stat-revenue').textContent = fmtPrice(todayRevenue);
  document.getElementById('stat-tx').textContent = sales.length;
  const revenueMain = document.getElementById('stat-revenue-main');
  if (revenueMain) revenueMain.textContent = fmtPrice(todayRevenue);
 
  const alertList = document.getElementById('alert-list');
  const alertEmpty = document.getElementById('alert-empty');
  if (low.length > 0) {
    alertList.innerHTML = low.map(p => `
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
    if (alertEmpty) alertEmpty.classList.add('hidden');
  } else {
    alertList.innerHTML = '';
    if (alertEmpty) alertEmpty.classList.remove('hidden');
  }
 
  const salesLog = document.getElementById('recent-sales-list');
  document.getElementById('tx-count').textContent = sales.length + ' ta tranzaksiya';
  if (sales.length === 0) {
    salesLog.innerHTML = '<div class="empty-state">Hali tranzaksiya yo\'q</div>';
  } else {
    salesLog.innerHTML = sales.slice().reverse().slice(0,5).map(s => `
      <div class="tx-row">
        <div class="tx-left">
          <div class="row-title">${s.name}</div>
          <div class="row-meta">${s.time} · <span class="model-badge ${badgeClass(s.model)}">${s.model}</span></div>
        </div>
        <div class="row-amount">${fmtPrice(s.price)}</div>
      </div>  
    `).join('');
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

  const models = getModels();
  if (activeFilter !== 'ALL') {
    const exists = models.some(m => modelKey(m) === modelKey(activeFilter));
    if (!exists) activeFilter = 'ALL';
  }

  row.innerHTML = '';
  row.appendChild(createFilterButton('ALL', 'BARCHASI'));
  models.forEach(m => row.appendChild(createFilterButton(m)));
  applyActiveFilterClass();
}

function renderModelDatalist() {
  const list = document.getElementById('model-list');
  if (!list) return;
  list.innerHTML = '';
  getModels().forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    list.appendChild(opt);
  });
}

function refreshModelUi() {
  models = getModels();
  renderModelDatalist();
  renderFilterButtons();
  renderModels();
}

function setFilter(val) {
  activeFilter = val === 'ALL' ? 'ALL' : normalizeModelName(val);
  applyActiveFilterClass();
  renderInventory();
}

function renderInventory() {
  const q = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
  let list = parts.filter(p => {
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
        ${p.stock < 3 ? `<span class="pill pill-danger ml-auto">⚠ KAM</span>` : ''}
      </div>
    </div>
    `;
  }).join('');
}

/* ============================================================
   MODELS
============================================================ */
function ensureModelExists(model) {
  const m = normalizeModelName(model);
  if (!m) return false;
  const k = modelKey(m);
  if (models.some(x => modelKey(x) === k)) return false;
  models.push(m);
  return true;
}

function partsCountForModel(model) {
  const k = modelKey(model);
  return parts.reduce((n, p) => n + (modelKey(p.model) === k ? 1 : 0), 0);
}

function addModel() {
  const input = document.getElementById('model-add-input');
  if (!input) return;

  const model = normalizeModelName(input.value);
  if (!model) {
    showToast('Model nomi kerak', '#e11d48');
    return;
  }

  const k = modelKey(model);
  if (getModels().some(m => modelKey(m) === k)) {
    showToast('Bunday model allaqachon bor', '#f59e0b');
    return;
  }

  models.push(model);
  input.value = '';
  showToast('Model qo\'shildi', '#1d7a5d');
  refreshModelUi();
}

function openModelEdit(model) {
  const oldEl = document.getElementById('model-old');
  const newEl = document.getElementById('model-new');
  if (!oldEl || !newEl) return;

  const m = normalizeModelName(model);
  oldEl.value = m;
  newEl.value = m;
  refreshModelUi();
  openModal('model-edit-modal');
  setTimeout(() => newEl.focus(), 0);
}

function saveModelEdit() {
  const oldEl = document.getElementById('model-old');
  const newEl = document.getElementById('model-new');
  if (!oldEl || !newEl) return;

  const oldModel = normalizeModelName(oldEl.value);
  const newModel = normalizeModelName(newEl.value);
  if (!newModel) {
    showToast('Model nomi kerak', '#e11d48');
    return;
  }

  const oldKey = modelKey(oldModel);
  const newKey = modelKey(newModel);
  if (oldKey !== newKey && getModels().some(m => modelKey(m) === newKey)) {
    showToast('Bunday model allaqachon bor', '#e11d48');
    return;
  }

  parts.forEach(p => {
    if (modelKey(p.model) === oldKey) p.model = newModel;
  });
  sales.forEach(s => {
    if (modelKey(s.model) === oldKey) s.model = newModel;
  });

  models = models.filter(m => modelKey(m) !== oldKey && modelKey(m) !== newKey);
  models.push(newModel);

  if (activeFilter !== 'ALL' && modelKey(activeFilter) === oldKey) {
    activeFilter = newModel;
  }

  closeModal('model-edit-modal');
  showToast('Model yangilandi');

  refreshModelUi();
  renderDashboard();
  renderInventory();
  renderSales();
}

function deleteModel(model) {
  const m = normalizeModelName(model);
  const used = partsCountForModel(m);
  if (used > 0) {
    showToast(`O'chirib bo'lmaydi: bu modeldan ${used} ta ehtiyot qism foydalanmoqda`, '#e11d48');
    return;
  }

  if (!confirm(`Model "${m}" o'chirilsinmi?`)) return;

  const k = modelKey(m);
  models = models.filter(x => modelKey(x) !== k);
  if (activeFilter !== 'ALL' && modelKey(activeFilter) === k) {
    activeFilter = 'ALL';
  }

  showToast('Model o\'chirildi', '#1d7a5d');
  refreshModelUi();
  renderInventory();
}

function renderModels() {
  const container = document.getElementById('models-list');
  const empty = document.getElementById('models-empty');
  const countLabel = document.getElementById('models-count-label');
  if (!container || !empty || !countLabel) return;

  const list = getModels();
  countLabel.textContent = list.length + ' ta model';

  container.innerHTML = '';
  if (list.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.forEach(model => {
    const used = partsCountForModel(model);

    const row = document.createElement('div');
    row.className = 'part-row flex items-center justify-between';

    const left = document.createElement('div');
    left.style.minWidth = '0';

    const top = document.createElement('div');
    top.className = 'flex items-center gap-2';

    const badge = document.createElement('span');
    badge.className = `model-badge ${badgeClass(model)}`;
    badge.textContent = model;
    top.appendChild(badge);

    const meta = document.createElement('span');
    meta.className = 'font-mono text-xs text-gray-600';
    meta.textContent = `${used} ta ehtiyot qism`;
    top.appendChild(meta);

    left.appendChild(top);

    const actions = document.createElement('div');
    actions.className = 'flex items-center gap-2 flex-shrink-0 ml-3';

    const renameBtn = document.createElement('button');
    renameBtn.type = 'button';
    renameBtn.className = 'btn-arc';
    renameBtn.textContent = 'NOMINI O\'ZG.';
    renameBtn.addEventListener('click', () => openModelEdit(model));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-danger';
    deleteBtn.textContent = 'O\'CHIRISH';
    if (used > 0) {
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
 
/* ============================================================
   SELL
============================================================ */
function sellOne(id) {
  const p = parts.find(x => x.id === id);
  if (!p || p.stock === 0) return;
  p.stock--;
  todayRevenue += p.price;
  const now = new Date();
  sales.push({
    id: Date.now(),
    name: p.name,
    model: p.model,
    price: p.price,
    time: String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0'),
  });
  renderInventory();
  renderDashboard();
  renderSales();
  showToast('Sotildi: ' + p.name, '#1d7a5d');
}
 
/* ============================================================
   ADD PART
============================================================ */
function savePart() {
  const name  = document.getElementById('add-name').value.trim();
  const code  = document.getElementById('add-code').value.trim();
  const model = normalizeModelName(document.getElementById('add-model').value);
  const stock = parseInt(document.getElementById('add-stock').value) || 0;
  const price = parseFloat(document.getElementById('add-price').value) || 0;
  if (!name) { showToast('Ehtiyot qism nomi kerak', '#e11d48'); return; }
  if (!model) { showToast('Avtomobil modeli kerak', '#e11d48'); return; }
  ensureModelExists(model);
  parts.push({ id: nextId++, name, code: code || 'AZ-' + String(nextId).padStart(4,'0'), model, stock, price });
  closeModal('add-modal');
  showToast('Qo\'shildi: ' + name);
  refreshModelUi();
  renderInventory();
  renderDashboard();
}
 
/* ============================================================
   EDIT PART
============================================================ */
function openEdit(id) {
  const p = parts.find(x => x.id === id);
  if (!p) return;
  document.getElementById('edit-id').value = id;
  document.getElementById('edit-name').value = p.name;
  document.getElementById('edit-code').value = p.code;
  document.getElementById('edit-model').value = p.model;
  document.getElementById('edit-stock').value = p.stock;
  document.getElementById('edit-price').value = p.price;
  openModal('edit-modal');
}
function updatePart() {
  const id = parseInt(document.getElementById('edit-id').value);
  const p = parts.find(x => x.id === id);
  if (!p) return;
  p.name  = document.getElementById('edit-name').value.trim() || p.name;
  p.code  = document.getElementById('edit-code').value.trim() || p.code;
  const newModel = normalizeModelName(document.getElementById('edit-model').value);
  if (newModel) {
    p.model = newModel;
    ensureModelExists(newModel);
  }
  p.stock = parseInt(document.getElementById('edit-stock').value) || 0;
  p.price = parseFloat(document.getElementById('edit-price').value) || 0;
  closeModal('edit-modal');
  showToast('Yangilandi: ' + p.name);
  refreshModelUi();
  renderInventory();
  renderDashboard();
}
 
/* ============================================================
   SALES PAGE
============================================================ */
function renderSales() {
  const container = document.getElementById('sales-log-full');
  const empty = document.getElementById('sales-empty');
  if (sales.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  const list = sales.slice().reverse();
  container.innerHTML = `
    <div class="card sales-summary">
      <div class="sales-kpis">
        <div>
          <div class="kpi-label">Bugungi tushum</div>
          <div class="kpi-value">${fmtPrice(todayRevenue)}</div>
        </div>
        <div class="kpi-right">
          <div class="kpi-label">Tranzaksiyalar</div>
          <div class="kpi-value">${sales.length}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <div>
          <div class="card-head-title">Barcha tranzaksiyalar</div>
          <div class="card-head-sub">${sales.length} ta yozuv</div>
        </div>
      </div>
      <div class="list-rows">
        ${list.map((s) => `
        <div class="tx-row">
          <div class="tx-left">
            <div class="row-title">${s.name}</div>
            <div class="row-meta">${s.time} · <span class="model-badge ${badgeClass(s.model)}">${s.model}</span></div>
          </div>
          <div class="row-amount">${fmtPrice(s.price)}</div>
        </div>
        `).join('')}
      </div>
    </div>
  `;
}
 
/* ============================================================
   INIT
============================================================ */
initTheme();
refreshModelUi();
renderDashboard();
renderInventory();
