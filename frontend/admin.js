(() => {
  const API = 'https://radha-rani-studio.onrender.com/api/v1';
  const $ = (id) => document.getElementById(id);
  const loginPanel = $('login-panel');
  const dashboard = $('dashboard');
  const state = { page: 1, pages: 1, bookings: [] };
  const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);
  const date = (value) => value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';

  function token() { return localStorage.getItem('token'); }
  function setFeedback(message, target = 'dashboard-feedback') { $(target).textContent = message || ''; }
  function showLogin(message = '') { loginPanel.hidden = false; dashboard.hidden = true; setFeedback(message, 'login-feedback'); }
  function showDashboard() { loginPanel.hidden = true; dashboard.hidden = false; }

  async function api(path) {
    const response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token()}` } });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Your session has expired. Please sign in again.');
    if (response.status === 403) throw new Error('This account does not have administrator access.');
    if (!response.ok) throw new Error(data.message || 'Unable to load dashboard data.');
    return data;
  }

  async function loadSummary() {
    const response = await api('/bookings/admin/summary');
    const d = response.data;
    $('stat-total').textContent = d.totalBookings;
    $('stat-paid').textContent = d.successfulPayments;
    $('stat-pending').textContent = d.pendingPayments;
    $('stat-revenue').textContent = money(d.totalRevenue);
    $('stat-upcoming').textContent = d.upcomingBookings;
  }

  function addCell(row, content, className) {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    if (content instanceof Node) cell.append(content); else cell.textContent = content;
    row.append(cell);
    return cell;
  }

  function renderBookings(bookings) {
    const tbody = $('booking-rows');
    tbody.replaceChildren();
    if (!bookings.length) {
      const row = document.createElement('tr');
      const cell = addCell(row, 'No bookings match these filters.', 'empty-state');
      cell.colSpan = 6;
      tbody.append(row);
      return;
    }
    bookings.forEach((booking) => {
      const row = document.createElement('tr');
      const client = booking.user || {};
      const pkg = booking.package || {};
      const clientBlock = document.createElement('div');
      const name = document.createElement('span'); name.className = 'client-name'; name.textContent = client.name || 'Unknown client';
      const email = document.createElement('span'); email.className = 'client-email'; email.textContent = client.email || 'No email recorded';
      const phone = document.createElement('span'); phone.className = 'client-phone'; phone.textContent = client.phoneNumber || 'No phone recorded';
      clientBlock.append(name, email, phone);
      addCell(row, clientBlock);
      addCell(row, pkg.name || 'Package unavailable');
      addCell(row, date(booking.eventDate));
      addCell(row, money(booking.price));
      const badge = document.createElement('span');
      badge.className = `status status-${booking.paymentStatus || 'pending'}`;
      badge.textContent = booking.paymentStatus || 'unknown';
      addCell(row, badge);
      const contactCell = document.createElement('td');
      if (client.email) {
        const link = document.createElement('a');
        link.className = 'contact-link';
        link.href = `mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent('Radha Rani Studio booking')}`;
        link.textContent = 'Email ↗';
        contactCell.append(link);
      }
      if (client.phoneNumber) {
        const digits = client.phoneNumber.replace(/\D/g, '');
        const whatsapp = document.createElement('a');
        whatsapp.className = 'contact-link whatsapp-link';
        whatsapp.href = `https://wa.me/${digits}`;
        whatsapp.target = '_blank';
        whatsapp.rel = 'noopener noreferrer';
        whatsapp.textContent = 'WhatsApp ↗';
        if (contactCell.childNodes.length) contactCell.append(document.createElement('br'));
        contactCell.append(whatsapp);
      }
      if (!client.email && !client.phoneNumber) contactCell.textContent = 'No contact details';
      row.append(contactCell);
      tbody.append(row);
    });
  }

  async function loadBookings() {
    const params = new URLSearchParams({ page: String(state.page), limit: '20' });
    if ($('status-filter').value) params.set('paymentStatus', $('status-filter').value);
    if ($('from-date').value) params.set('from', $('from-date').value);
    if ($('to-date').value) params.set('to', $('to-date').value);
    const response = await api(`/bookings/admin/all?${params}`);
    state.pages = response.pages || 1;
    state.bookings = response.data.bookings || [];
    renderBookings(state.bookings);
    $('result-count').textContent = `${response.total || 0} booking${response.total === 1 ? '' : 's'}`;
    $('page-label').textContent = `Page ${state.page} of ${state.pages}`;
    $('prev-page').disabled = state.page <= 1;
    $('next-page').disabled = state.page >= state.pages;
  }

  async function refresh() {
    setFeedback('');
    $('refresh-btn').disabled = true;
    try {
      await Promise.all([loadSummary(), loadBookings()]);
      $('last-updated').textContent = `Updated ${new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date())}`;
    } catch (error) {
      if (/session has expired|administrator access/i.test(error.message)) {
        localStorage.removeItem('token'); localStorage.removeItem('userRole'); showLogin(error.message);
      } else setFeedback(error.message);
    } finally { $('refresh-btn').disabled = false; }
  }

  $('admin-login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true; setFeedback('Signing in…', 'login-feedback');
    try {
      const response = await fetch(`${API}/users/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: $('admin-email').value.trim(), password: $('admin-password').value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Sign in failed.');
      if (data.data?.user?.role !== 'admin') throw new Error('This account is not an administrator. Ask the site owner to grant admin access.');
      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', data.data.user.role);
      localStorage.setItem('userName', data.data.user.name || 'Administrator');
      showDashboard(); await refresh();
    } catch (error) { setFeedback(error.message, 'login-feedback'); }
    finally { button.disabled = false; }
  });

  $('refresh-btn').addEventListener('click', refresh);
  $('logout-btn').addEventListener('click', () => {
    ['token', 'userRole', 'userName', 'userEmail'].forEach((key) => localStorage.removeItem(key));
    $('admin-password').value = ''; showLogin('You have been logged out.');
  });
  ['status-filter', 'from-date', 'to-date'].forEach((id) => $(id).addEventListener('change', () => { state.page = 1; loadBookings().catch((e) => setFeedback(e.message)); }));
  $('clear-filters').addEventListener('click', () => {
    $('status-filter').value = ''; $('from-date').value = ''; $('to-date').value = ''; $('search-input').value = ''; state.page = 1;
    loadBookings().catch((e) => setFeedback(e.message));
  });
  $('search-input').addEventListener('input', () => {
    const term = $('search-input').value.trim().toLowerCase();
    const filtered = state.bookings.filter((b) => [b.user?.name, b.user?.email, b.user?.phoneNumber, b.package?.name].some((v) => String(v || '').toLowerCase().includes(term)));
    renderBookings(filtered);
  });
  $('prev-page').addEventListener('click', () => { if (state.page > 1) { state.page -= 1; refresh(); } });
  $('next-page').addEventListener('click', () => { if (state.page < state.pages) { state.page += 1; refresh(); } });

  if (token() && localStorage.getItem('userRole') === 'admin') { showDashboard(); refresh(); }
  else showLogin();
})();
