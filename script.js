/* ==========================================================================
   ROLENCE MONEY TRACKER — APPLICATION LOGIC
   Vanilla JS. No frameworks. State lives in localStorage.
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------
     CONSTANTS
  ------------------------------------------------------------------ */
  const STORAGE_KEY = 'rolenceMoneyTracker';
  const ROWS_PER_PAGE = 8;
  const CURRENCY = 'TZS';

  const CATEGORY_COLORS = {
    Food: '#0099D8',
    Transport: '#00C48C',
    Shopping: '#D9A441',
    Education: '#7C5CFF',
    Entertainment: '#FF7AB6',
    Utilities: '#36B9CC',
    Health: '#FF5C5C',
    Savings: '#1ABC9C',
    Other: '#8C9AAC'
  };

  const CATEGORY_ICONS = {
    Food: '🍽️', Transport: '🚌', Shopping: '🛍️', Education: '🎓',
    Entertainment: '🎬', Utilities: '💡', Health: '🩺', Savings: '💰', Other: '📦'
  };

  /* ------------------------------------------------------------------
     STATE
  ------------------------------------------------------------------ */
  let state = {
    user: { name: '', initialBalance: 0, photo: null },
    transactions: [],
    theme: 'light'
  };

  let editingId = null;       // id currently being edited in expense modal
  let pendingConfirmAction = null; // function to run on confirm-modal accept
  let currentPage = 1;
  let charts = {}; // keyed dynamically by canvas id (categoryPieChart, categoryPieChart2, trend, monthly)

  /* ------------------------------------------------------------------
     STORAGE
  ------------------------------------------------------------------ */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = { ...state, ...parsed };
      }
    } catch (e) {
      console.error('Failed to load saved data', e);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save data', e);
      toast('Could not save data — storage may be full.', 'error');
    }
  }

  function hasProfile() {
    return !!(state.user && state.user.name);
  }

  /* ------------------------------------------------------------------
     UTILITIES
  ------------------------------------------------------------------ */
  function formatCurrency(amount) {
    const n = Number(amount) || 0;
    return `${CURRENCY} ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }

  function formatDateShort(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function generateId() {
    return 'tx_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function animateCounter(el, fromVal, toVal, formatter) {
    const duration = 700;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromVal + (toVal - fromVal) * eased;
      el.textContent = formatter(current);
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = formatter(toVal);
    }
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------
     DERIVED DATA
  ------------------------------------------------------------------ */
  function getTotalSpent() {
    return state.transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  }

  function getCurrentBalance() {
    return Number(state.user.initialBalance) - getTotalSpent();
  }

  function getLargestExpense() {
    if (!state.transactions.length) return 0;
    return Math.max(...state.transactions.map(t => Number(t.amount)));
  }

  function getCategoryTotals() {
    const totals = {};
    state.transactions.forEach(t => {
      totals[t.category] = (totals[t.category] || 0) + Number(t.amount);
    });
    return totals;
  }

  function getLast7DaysTotals() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const totals = days.map(day =>
      state.transactions.filter(t => t.date === day).reduce((s, t) => s + Number(t.amount), 0)
    );
    const labels = days.map(day => new Date(day + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' }));
    return { labels, totals };
  }

  function getMonthlyTotals(year) {
    const totals = new Array(12).fill(0);
    state.transactions.forEach(t => {
      const d = new Date(t.date + 'T00:00:00');
      if (d.getFullYear() === year) totals[d.getMonth()] += Number(t.amount);
    });
    return totals;
  }

  /* ------------------------------------------------------------------
     TOASTS
  ------------------------------------------------------------------ */
  function toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;

    const icons = {
      success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#00C48C" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
      error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#FF5C5C" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
      info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#00A651" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/></svg>'
    };

    el.innerHTML = `${icons[type] || icons.info}<span>${escapeHtml(message)}</span>`;
    container.appendChild(el);

    setTimeout(() => {
      el.classList.add('toast-leave');
      setTimeout(() => el.remove(), 240);
    }, 3200);
  }

  /* ------------------------------------------------------------------
     SETUP SCREEN
  ------------------------------------------------------------------ */
  function initSetupScreen() {
    const setupScreen = document.getElementById('setupScreen');
    const appEl = document.getElementById('app');

    if (hasProfile()) {
      setupScreen.classList.add('hidden');
      appEl.classList.remove('hidden');
      return;
    }

    setupScreen.classList.remove('hidden');
    appEl.classList.add('hidden');

    const form = document.getElementById('setupForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('setupName');
      const balanceInput = document.getElementById('setupBalance');
      const nameErr = document.getElementById('setupNameError');
      const balErr = document.getElementById('setupBalanceError');
      nameErr.textContent = '';
      balErr.textContent = '';

      const name = nameInput.value.trim();
      const balance = parseFloat(balanceInput.value);

      let valid = true;
      if (!name) { nameErr.textContent = 'Please enter your name.'; valid = false; }
      if (isNaN(balance) || balance < 0) { balErr.textContent = 'Enter a valid starting balance.'; valid = false; }
      if (!valid) return;

      state.user = { name, initialBalance: balance, photo: null };
      state.transactions = state.transactions || [];
      saveState();

      setupScreen.classList.add('hidden');
      appEl.classList.remove('hidden');
      toast(`Welcome, ${name}!`, 'success');
      renderAll();
    });
  }

  /* ------------------------------------------------------------------
     HEADER: GREETING + CLOCK
  ------------------------------------------------------------------ */
  function renderGreeting() {
    document.getElementById('greetingText').textContent = `Hello, ${state.user.name} 👋`;
    document.getElementById('profileName').textContent = state.user.name;
    const initial = state.user.name.charAt(0).toUpperCase() || '?';
    setAvatarDisplay('profileAvatarInitial', 'profileAvatarPhoto', initial);
    setAvatarDisplay('topbarAvatarInitial', 'topbarAvatarPhoto', initial);
    document.getElementById('cardHolderName').textContent = state.user.name.toUpperCase();
    updateSettingsAvatarPreview();
  }

  // Shows the uploaded photo if one exists, otherwise falls back to the user's initial.
  function setAvatarDisplay(initialId, imgId, initial) {
    const initialEl = document.getElementById(initialId);
    const imgEl = document.getElementById(imgId);
    if (state.user.photo) {
      imgEl.src = state.user.photo;
      imgEl.classList.remove('hidden');
      initialEl.classList.add('hidden');
    } else {
      imgEl.removeAttribute('src');
      imgEl.classList.add('hidden');
      initialEl.classList.remove('hidden');
      initialEl.textContent = initial;
    }
  }

  function updateSettingsAvatarPreview() {
    const initial = state.user.name.charAt(0).toUpperCase() || '?';
    setAvatarDisplay('settingsAvatarInitial', 'settingsAvatarPhoto', initial);
    document.getElementById('removePhotoBtn').classList.toggle('hidden', !state.user.photo);
  }

  function updateClock() {
    const now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  /* ------------------------------------------------------------------
     RENDER: BALANCE CARD + STATS
  ------------------------------------------------------------------ */
  let lastBalanceShown = null;

  function renderBalanceCard() {
    const balance = getCurrentBalance();
    const el = document.getElementById('balanceAmount');
    const card = document.getElementById('balanceCard');

    if (lastBalanceShown === null) {
      el.textContent = formatCurrency(balance);
    } else if (lastBalanceShown !== balance) {
      animateCounter(el, lastBalanceShown, balance, (v) => formatCurrency(v));
      card.classList.remove('updating');
      void card.offsetWidth;
      card.classList.add('updating');
    }
    lastBalanceShown = balance;

    // Pseudo masked card number derived from name+balance, purely cosmetic
    const seed = (state.user.name.length * 7 + Math.round(Math.abs(balance))).toString().padStart(4, '0').slice(-4);
    document.getElementById('cardNumber').textContent = `•••• •••• •••• ${seed}`;
  }

  function renderStatCards() {
    const totalSpent = getTotalSpent();
    const count = state.transactions.length;
    const largest = getLargestExpense();
    const avg = count ? totalSpent / count : 0;

    setStatValue('statTotalSpent', formatCurrency(totalSpent));
    setStatValue('statTransactionCount', String(count));
    setStatValue('statLargestExpense', formatCurrency(largest));
    setStatValue('statAvgExpense', formatCurrency(avg));
  }

  function setStatValue(id, text) {
    const el = document.getElementById(id);
    if (el.textContent === text) return;
    el.textContent = text;
    el.classList.remove('count-flash');
    void el.offsetWidth;
    el.classList.add('count-flash');
  }

  /* ------------------------------------------------------------------
     CHARTS
  ------------------------------------------------------------------ */
  function getChartTheme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text: dark ? '#98A6BC' : '#5B6B7F',
      grid: dark ? '#232E42' : '#E4E9F0'
    };
  }

  function renderPieChart(canvasId, emptyElId) {
    const totals = getCategoryTotals();
    const labels = Object.keys(totals);
    const data = Object.values(totals);
    const canvas = document.getElementById(canvasId);
    const emptyEl = emptyElId ? document.getElementById(emptyElId) : null;

    if (!labels.length) {
      if (charts[canvasId]) { charts[canvasId].destroy(); charts[canvasId] = null; }
      canvas.classList.add('hidden');
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    canvas.classList.remove('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');

    const theme = getChartTheme();
    const colors = labels.map(l => CATEGORY_COLORS[l] || '#8C9AAC');

    if (charts[canvasId]) {
      charts[canvasId].data.labels = labels;
      charts[canvasId].data.datasets[0].data = data;
      charts[canvasId].data.datasets[0].backgroundColor = colors;
      charts[canvasId].options.plugins.legend.labels.color = theme.text;
      charts[canvasId].update();
      return;
    }

    charts[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '64%',
        plugins: {
          legend: { position: 'bottom', labels: { color: theme.text, font: { family: 'Inter', size: 11 }, padding: 14, usePointStyle: true } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.raw)}` } }
        },
        animation: { animateScale: true, animateRotate: true }
      }
    });
  }

  function renderTrendChart() {
    const { labels, totals } = getLast7DaysTotals();
    const canvas = document.getElementById('trendBarChart');
    const emptyEl = document.getElementById('trendEmpty');
    const hasData = totals.some(v => v > 0);

    if (!hasData) {
      if (charts.trend) { charts.trend.destroy(); charts.trend = null; }
      canvas.classList.add('hidden');
      emptyEl.classList.remove('hidden');
      return;
    }
    canvas.classList.remove('hidden');
    emptyEl.classList.add('hidden');

    const theme = getChartTheme();

    if (charts.trend) {
      charts.trend.data.labels = labels;
      charts.trend.data.datasets[0].data = totals;
      charts.trend.options.scales.x.ticks.color = theme.text;
      charts.trend.options.scales.y.ticks.color = theme.text;
      charts.trend.options.scales.y.grid.color = theme.grid;
      charts.trend.update();
      return;
    }

    charts.trend = new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets: [{ data: totals, backgroundColor: '#00A651', borderRadius: 6, maxBarThickness: 28 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => formatCurrency(ctx.raw) } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: theme.text, font: { family: 'Inter', size: 11 } } },
          y: { grid: { color: theme.grid }, ticks: { color: theme.text, font: { family: 'Inter', size: 11 }, callback: (v) => v >= 1000 ? (v / 1000) + 'k' : v } }
        }
      }
    });
  }

  function renderMonthlyChart() {
    const year = new Date().getFullYear();
    const data = getMonthlyTotals(year);
    const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const canvas = document.getElementById('monthlyBarChart');
    document.getElementById('monthlyChartSub').textContent = String(year);
    const theme = getChartTheme();

    if (charts.monthly) {
      charts.monthly.data.datasets[0].data = data;
      charts.monthly.options.scales.x.ticks.color = theme.text;
      charts.monthly.options.scales.y.ticks.color = theme.text;
      charts.monthly.options.scales.y.grid.color = theme.grid;
      charts.monthly.update();
      return;
    }

    charts.monthly = new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets: [{ data, backgroundColor: '#00592C', borderRadius: 6, maxBarThickness: 30 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => formatCurrency(ctx.raw) } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: theme.text, font: { family: 'Inter', size: 11 } } },
          y: { grid: { color: theme.grid }, ticks: { color: theme.text, font: { family: 'Inter', size: 11 }, callback: (v) => v >= 1000 ? (v / 1000) + 'k' : v } }
        }
      }
    });
  }

  function renderCategoryBreakdownList() {
    const totals = getCategoryTotals();
    const wrap = document.getElementById('categoryBreakdownList');
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const grand = entries.reduce((s, [, v]) => s + v, 0) || 1;

    if (!entries.length) {
      wrap.innerHTML = `<p style="color:var(--text-faint);font-size:13px;">No spending recorded yet.</p>`;
      return;
    }

    wrap.innerHTML = entries.map(([cat, val]) => {
      const pct = Math.round((val / grand) * 100);
      const color = CATEGORY_COLORS[cat] || '#8C9AAC';
      return `
        <div class="breakdown-row">
          <span class="breakdown-label">${escapeHtml(cat)}</span>
          <div class="breakdown-track"><div class="breakdown-fill" style="width:${pct}%;background:${color}"></div></div>
          <span class="breakdown-value">${formatCurrency(val)} (${pct}%)</span>
        </div>`;
    }).join('');
  }

  function renderAllCharts() {
    renderPieChart('categoryPieChart', 'pieEmpty');
    renderPieChart('categoryPieChart2', null);
    renderTrendChart();
    renderMonthlyChart();
    renderCategoryBreakdownList();
  }

  /* ------------------------------------------------------------------
     RECENT TRANSACTIONS (DASHBOARD)
  ------------------------------------------------------------------ */
  function renderRecentList() {
    const wrap = document.getElementById('recentList');
    const emptyState = document.getElementById('dashboardEmptyState');
    const recent = [...state.transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt)
      .slice(0, 6);

    if (!recent.length) {
      wrap.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }
    emptyState.classList.add('hidden');

    wrap.innerHTML = recent.map(t => `
      <div class="recent-item">
        <div class="recent-icon">${CATEGORY_ICONS[t.category] || '📦'}</div>
        <div class="recent-info">
          <div class="recent-name">${escapeHtml(t.name)}</div>
          <div class="recent-meta">${escapeHtml(t.category)} • ${formatDateShort(t.date)}</div>
        </div>
        <div class="recent-amount">-${formatCurrency(t.amount)}</div>
      </div>
    `).join('');
  }

  /* ------------------------------------------------------------------
     TRANSACTIONS TABLE (search / filter / sort / paginate)
  ------------------------------------------------------------------ */
  function populateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    const current = select.value;
    const categories = Object.keys(CATEGORY_COLORS);
    select.innerHTML = `<option value="all">All categories</option>` +
      categories.map(c => `<option value="${c}">${c}</option>`).join('');
    select.value = current || 'all';
  }

  function getFilteredSortedTransactions() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const sort = document.getElementById('sortField').value;

    let list = state.transactions.filter(t => {
      const matchesQuery = !query || t.name.toLowerCase().includes(query) || t.category.toLowerCase().includes(query);
      const matchesCategory = category === 'all' || t.category === category;
      return matchesQuery && matchesCategory;
    });

    list.sort((a, b) => {
      if (sort === 'date-desc') return new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt;
      if (sort === 'date-asc') return new Date(a.date) - new Date(b.date) || a.createdAt - b.createdAt;
      if (sort === 'amount-desc') return b.amount - a.amount;
      if (sort === 'amount-asc') return a.amount - b.amount;
      return 0;
    });

    return list;
  }

  function renderTransactionsTable() {
    const tbody = document.getElementById('transactionsTableBody');
    const emptyState = document.getElementById('tableEmptyState');
    const list = getFilteredSortedTransactions();

    if (!state.transactions.length) {
      tbody.innerHTML = '';
      document.querySelector('.table-wrap .data-table').classList.add('hidden');
      emptyState.classList.remove('hidden');
      renderPagination(0, 1);
      return;
    }
    document.querySelector('.table-wrap .data-table').classList.remove('hidden');
    emptyState.classList.add('hidden');

    const totalPages = Math.max(1, Math.ceil(list.length / ROWS_PER_PAGE));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    const pageItems = list.slice(start, start + ROWS_PER_PAGE);

    if (!pageItems.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-faint);padding:32px 0;">No matching transactions.</td></tr>`;
    } else {
      tbody.innerHTML = pageItems.map(t => `
        <tr data-id="${t.id}">
          <td class="cell-date">${formatDateShort(t.date)}</td>
          <td>${escapeHtml(t.name)}</td>
          <td><span class="category-chip">${CATEGORY_ICONS[t.category] || ''} ${escapeHtml(t.category)}</span></td>
          <td class="cell-amount">-${formatCurrency(t.amount)}</td>
          <td class="cell-actions">
            <button class="action-btn action-edit" data-action="edit" data-id="${t.id}" title="Edit">
              <svg viewBox="0 0 24 24" fill="none"><path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.4 2.6a2 2 0 1 1 2.8 2.8L12 14.6l-4 1 1-4 9.4-9.4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>
            </button>
            <button class="action-btn action-delete" data-action="delete" data-id="${t.id}" title="Delete">
              <svg viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </td>
        </tr>
      `).join('');
    }

    renderPagination(list.length, totalPages);
  }

  function renderPagination(totalItems, totalPages) {
    const wrap = document.getElementById('pagination');
    if (totalItems <= ROWS_PER_PAGE) { wrap.innerHTML = ''; return; }

    let html = `<button class="page-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button class="page-btn" data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>›</button>`;
    wrap.innerHTML = html;
  }

  /* ------------------------------------------------------------------
     RENDER ALL
  ------------------------------------------------------------------ */
  function renderAll() {
    renderGreeting();
    renderBalanceCard();
    renderStatCards();
    renderAllCharts();
    renderRecentList();
    populateCategoryFilter();
    renderTransactionsTable();
  }

  /* ------------------------------------------------------------------
     EXPENSE MODAL
  ------------------------------------------------------------------ */
  function openExpenseModal(transaction = null) {
    const overlay = document.getElementById('expenseModalOverlay');
    const title = document.getElementById('expenseModalTitle');
    const submitBtn = document.getElementById('expenseSubmitBtn');
    clearExpenseFormErrors();

    if (transaction) {
      editingId = transaction.id;
      title.textContent = 'Edit expense';
      submitBtn.textContent = 'Save changes';
      document.getElementById('expenseName').value = transaction.name;
      document.getElementById('expenseCategory').value = transaction.category;
      document.getElementById('expenseAmount').value = transaction.amount;
      document.getElementById('expenseDate').value = transaction.date;
    } else {
      editingId = null;
      title.textContent = 'Add expense';
      submitBtn.textContent = 'Add expense';
      document.getElementById('expenseForm').reset();
      document.getElementById('expenseDate').value = todayISO();
    }

    overlay.classList.add('show');
    setTimeout(() => document.getElementById('expenseName').focus(), 60);
  }

  function closeExpenseModal() {
    document.getElementById('expenseModalOverlay').classList.remove('show');
    editingId = null;
  }

  function clearExpenseFormErrors() {
    ['expenseNameError', 'expenseCategoryError', 'expenseAmountError', 'expenseDateError'].forEach(id => {
      document.getElementById(id).textContent = '';
    });
  }

  function validateExpenseForm() {
    clearExpenseFormErrors();
    let valid = true;

    const name = document.getElementById('expenseName').value.trim();
    const category = document.getElementById('expenseCategory').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const date = document.getElementById('expenseDate').value;

    if (!name) { document.getElementById('expenseNameError').textContent = 'Enter an expense name.'; valid = false; }
    if (!category) { document.getElementById('expenseCategoryError').textContent = 'Select a category.'; valid = false; }
    if (isNaN(amount) || amount <= 0) { document.getElementById('expenseAmountError').textContent = 'Enter a valid amount greater than 0.'; valid = false; }
    if (!date) { document.getElementById('expenseDateError').textContent = 'Select a date.'; valid = false; }
    else {
      const d = new Date(date);
      const max = new Date(); max.setDate(max.getDate() + 1);
      if (isNaN(d) || d > max) { document.getElementById('expenseDateError').textContent = 'Date cannot be in the future.'; valid = false; }
    }

    return valid ? { name, category, amount, date } : null;
  }

  function handleExpenseFormSubmit(e) {
    e.preventDefault();
    const data = validateExpenseForm();
    if (!data) return;

    if (editingId) {
      const tx = state.transactions.find(t => t.id === editingId);
      if (tx) {
        Object.assign(tx, data);
        toast('Expense updated.', 'success');
      }
    } else {
      state.transactions.push({ id: generateId(), createdAt: Date.now(), ...data });
      toast('Expense added.', 'success');
    }

    saveState();
    closeExpenseModal();
    renderAll();
  }

  /* ------------------------------------------------------------------
     CONFIRM MODAL
  ------------------------------------------------------------------ */
  function openConfirmModal(title, message, onAccept) {
    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalMessage').textContent = message;
    pendingConfirmAction = onAccept;
    document.getElementById('confirmModalOverlay').classList.add('show');
  }

  function closeConfirmModal() {
    document.getElementById('confirmModalOverlay').classList.remove('show');
    pendingConfirmAction = null;
  }

  /* ------------------------------------------------------------------
     DELETE / EDIT HANDLERS (event delegation on table)
  ------------------------------------------------------------------ */
  function handleTableClick(e) {
    const btn = e.target.closest('.action-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;

    if (btn.dataset.action === 'edit') {
      openExpenseModal(tx);
    } else if (btn.dataset.action === 'delete') {
      openConfirmModal('Delete this transaction?', `"${tx.name}" (${formatCurrency(tx.amount)}) will be removed and the amount restored to your balance.`, () => {
        state.transactions = state.transactions.filter(t => t.id !== id);
        saveState();
        renderAll();
        toast('Expense deleted.', 'success');
      });
    }
  }

  /* ------------------------------------------------------------------
     NAVIGATION
  ------------------------------------------------------------------ */
  function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewName}`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === viewName));
    closeSidebarMobile();
    if (viewName === 'analytics') renderAllCharts();
  }

  function openSidebarMobile() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('show');
  }
  function closeSidebarMobile() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
  }

  /* ------------------------------------------------------------------
     DARK MODE
  ------------------------------------------------------------------ */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('darkModeSwitch').checked = theme === 'dark';
    state.theme = theme;
    saveState();
    if (hasProfile()) renderAllCharts(); // re-tint chart text/grid colors (skip while setup screen is showing)
  }

  function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    toast(`${next === 'dark' ? 'Dark' : 'Light'} mode enabled.`, 'info');
  }

  /* ------------------------------------------------------------------
     EXPORT / IMPORT
  ------------------------------------------------------------------ */
  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    if (!state.transactions.length) { toast('No transactions to export.', 'error'); return; }
    const header = 'Date,Name,Category,Amount\n';
    const rows = state.transactions.map(t =>
      [t.date, `"${t.name.replace(/"/g, '""')}"`, t.category, t.amount].join(',')
    ).join('\n');
    downloadBlob(header + rows, `rolence-transactions-${todayISO()}.csv`, 'text/csv');
    toast('CSV exported.', 'success');
  }

  function exportJSON() {
    downloadBlob(JSON.stringify(state, null, 2), `rolence-backup-${todayISO()}.json`, 'application/json');
    toast('JSON backup exported.', 'success');
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.user || !Array.isArray(data.transactions)) throw new Error('Invalid file format');
        state = {
          user: { name: data.user.name, initialBalance: data.user.initialBalance, photo: data.user.photo || null },
          transactions: data.transactions,
          theme: data.theme || state.theme
        };
        saveState();
        applyTheme(state.theme);
        renderAll();
        populateProfileForm();
        toast('Backup imported successfully.', 'success');
      } catch (err) {
        toast('Could not import file — invalid backup format.', 'error');
      }
    };
    reader.readAsText(file);
  }

  /* ------------------------------------------------------------------
     SETTINGS: PROFILE FORM
  ------------------------------------------------------------------ */
  function populateProfileForm() {
    document.getElementById('profileNameInput').value = state.user.name;
    document.getElementById('profileBalanceInput').value = state.user.initialBalance;
    updateSettingsAvatarPreview();
  }

  function handleProfileFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('profileNameInput').value.trim();
    const balance = parseFloat(document.getElementById('profileBalanceInput').value);
    if (!name || isNaN(balance) || balance < 0) {
      toast('Please enter a valid name and balance.', 'error');
      return;
    }
    state.user = { ...state.user, name, initialBalance: balance };
    saveState();
    renderAll();
    toast('Profile updated.', 'success');
  }

  /* ------------------------------------------------------------------
     PROFILE PHOTO (upload, auto-crop/resize, remove)
  ------------------------------------------------------------------ */
  const PHOTO_MAX_SOURCE_BYTES = 8 * 1024 * 1024; // 8MB raw upload ceiling
  const PHOTO_OUTPUT_SIZE = 240; // px, square
  const PHOTO_JPEG_QUALITY = 0.86;

  function handlePhotoFile(file) {
    if (!file.type.startsWith('image/')) {
      toast('Please choose an image file.', 'error');
      return;
    }
    if (file.size > PHOTO_MAX_SOURCE_BYTES) {
      toast('That image is too large (max 8MB).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Center-crop to a square, then downscale — keeps the stored
        // data URL small so it fits comfortably in localStorage.
        const size = PHOTO_OUTPUT_SIZE;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

        state.user.photo = canvas.toDataURL('image/jpeg', PHOTO_JPEG_QUALITY);
        saveState();
        renderGreeting();
        toast('Profile photo updated.', 'success');
      };
      img.onerror = () => toast('Could not read that image.', 'error');
      img.src = reader.result;
    };
    reader.onerror = () => toast('Could not read that file.', 'error');
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    if (!state.user.photo) return;
    state.user.photo = null;
    saveState();
    renderGreeting();
    toast('Profile photo removed.', 'success');
  }

  /* ------------------------------------------------------------------
     LOGOUT
  ------------------------------------------------------------------ */
  function logout() {
    openConfirmModal(
      'Log out?',
      'You will return to the login page. Your transactions and settings will be saved.',
      () => {
        state.user = { name: '', initialBalance: 0, photo: null };
        saveState();
        toast('Logged out successfully.', 'success');
        document.getElementById('app').classList.add('hidden');
        initSetupScreen();
      }
    );
  }

  /* ------------------------------------------------------------------
     CLEAR ALL DATA
  ------------------------------------------------------------------ */
  function clearAllData() {
    openConfirmModal(
      'Clear all data?',
      'This will permanently delete your profile and every transaction stored in this browser. This cannot be undone.',
      () => {
        localStorage.removeItem(STORAGE_KEY);
        state = { user: { name: '', initialBalance: 0, photo: null }, transactions: [], theme: state.theme };
        toast('All data cleared.', 'success');
        document.getElementById('app').classList.add('hidden');
        initSetupScreen();
      }
    );
  }

  /* ------------------------------------------------------------------
     KEYBOARD SHORTCUTS
  ------------------------------------------------------------------ */
  function handleKeydown(e) {
    const tag = (e.target.tagName || '').toLowerCase();
    const isTyping = tag === 'input' || tag === 'select' || tag === 'textarea';

    if (e.key === 'Escape') {
      closeExpenseModal();
      closeConfirmModal();
      return;
    }
    if (isTyping) return;

    if (e.key.toLowerCase() === 'n') { e.preventDefault(); openExpenseModal(); }
    if (e.key === '/') { e.preventDefault(); switchView('transactions'); document.getElementById('searchInput').focus(); }
    if (e.key.toLowerCase() === 'd') { e.preventDefault(); toggleTheme(); }
  }

  /* ------------------------------------------------------------------
     EVENT WIRING
  ------------------------------------------------------------------ */
  function wireEvents() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
    document.querySelectorAll('[data-view-link]').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.viewLink));
    });

    // Mobile sidebar
    document.getElementById('hamburgerBtn').addEventListener('click', openSidebarMobile);
    document.getElementById('sidebarOverlay').addEventListener('click', closeSidebarMobile);

    // Theme
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('darkModeSwitch').addEventListener('change', toggleTheme);

    // Profile avatar quick-access -> jump to Settings
    document.getElementById('sidebarProfile').addEventListener('click', () => switchView('settings'));
    document.getElementById('topbarAvatarBtn').addEventListener('click', () => switchView('settings'));

    // Profile photo upload / remove
    document.getElementById('uploadPhotoBtn').addEventListener('click', () => document.getElementById('photoFileInput').click());
    document.getElementById('photoFileInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handlePhotoFile(file);
      e.target.value = '';
    });
    document.getElementById('removePhotoBtn').addEventListener('click', removePhoto);

    // Expense modal triggers
    document.getElementById('addExpenseTopBtn').addEventListener('click', () => openExpenseModal());
    document.getElementById('addExpenseBtn').addEventListener('click', () => openExpenseModal());
    document.getElementById('emptyStateAddBtn').addEventListener('click', () => openExpenseModal());
    document.getElementById('expenseModalClose').addEventListener('click', closeExpenseModal);
    document.getElementById('expenseModalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'expenseModalOverlay') closeExpenseModal();
    });
    document.getElementById('expenseResetBtn').addEventListener('click', () => {
      document.getElementById('expenseForm').reset();
      document.getElementById('expenseDate').value = todayISO();
      clearExpenseFormErrors();
    });
    document.getElementById('expenseForm').addEventListener('submit', handleExpenseFormSubmit);

    // Confirm modal
    document.getElementById('confirmCancelBtn').addEventListener('click', closeConfirmModal);
    document.getElementById('confirmModalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'confirmModalOverlay') closeConfirmModal();
    });
    document.getElementById('confirmAcceptBtn').addEventListener('click', () => {
      if (typeof pendingConfirmAction === 'function') pendingConfirmAction();
      closeConfirmModal();
    });

    // Table interactions
    document.getElementById('transactionsTableBody').addEventListener('click', handleTableClick);
    document.getElementById('searchInput').addEventListener('input', debounce(() => { currentPage = 1; renderTransactionsTable(); }, 200));
    document.getElementById('categoryFilter').addEventListener('change', () => { currentPage = 1; renderTransactionsTable(); });
    document.getElementById('sortField').addEventListener('change', () => { currentPage = 1; renderTransactionsTable(); });

    document.getElementById('pagination').addEventListener('click', (e) => {
      const btn = e.target.closest('.page-btn');
      if (!btn || btn.disabled) return;
      const page = btn.dataset.page;
      if (page === 'prev') currentPage--;
      else if (page === 'next') currentPage++;
      else currentPage = parseInt(page, 10);
      renderTransactionsTable();
    });

    // Settings
    document.getElementById('profileForm').addEventListener('submit', handleProfileFormSubmit);
    document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
    document.getElementById('exportJsonBtn').addEventListener('click', exportJSON);
    document.getElementById('importJsonBtn').addEventListener('click', () => document.getElementById('importJsonInput').click());
    document.getElementById('importJsonInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) importJSON(file);
      e.target.value = '';
    });
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('clearAllBtn').addEventListener('click', clearAllData);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeydown);
  }

  /* ------------------------------------------------------------------
     INIT
  ------------------------------------------------------------------ */
  function init() {
    loadState();
    applyTheme(state.theme || 'light');
    initSetupScreen();
    wireEvents();

    if (hasProfile()) {
      populateProfileForm();
      renderAll();
    }

    // Update footer year
    const footerYearEl = document.getElementById('footerYear');
    if (footerYearEl) {
      footerYearEl.textContent = new Date().getFullYear();
    }

    updateClock();
    setInterval(updateClock, 1000 * 30);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
