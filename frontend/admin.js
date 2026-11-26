(() => {
  const API = 'https://radha-rani-studio.onrender.com/api/v1';
  const $ = (id) => document.getElementById(id);
  const loginPanel = $('login-panel');
  const dashboard = $('dashboard');
  const state = { page: 1, pages: 1, bookings: [], packages: [] };
  const money = (value) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(Number(value) || 0);
  const date = (value) => value
    ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
    : '—';
  const todayIndia = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  function token() { return localStorage.getItem('token'); }
  function setFeedback(message, target = 'dashboard-feedback') {
    const element = $(target);
    if (element) element.textContent = message || '';
  }
  function showLogin(message = '') {
    loginPanel.hidden = false;
    dashboard.hidden = true;
    setFeedback(message, 'login-feedback');
  }
  function showDashboard() {
    loginPanel.hidden = true;
    dashboard.hidden = false;
  }

  async function api(path, options = {}) {
    const headers = { Authorization: `Bearer ${token()}`, ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${API}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Your session has expired. Please sign in again.');
    if (response.status === 403) throw new Error('This account does not have administrator access.');
    if (!response.ok) throw new Error(data.message || 'Unable to complete the request.');
    return data;
  }

  function collectedAmount(booking) {
    if (booking.amountPaid !== undefined && booking.amountPaid !== null) return Number(booking.amountPaid) || 0;
    return booking.paymentStatus === 'paid' ? Number(booking.price) || 0 : 0;
  }

  function outstandingBalance(booking) {
    if (booking.balanceDue !== undefined && booking.balanceDue !== null) return Number(booking.balanceDue) || 0;
    return booking.paymentStatus === 'paid' ? 0 : Math.max((Number(booking.price) || 0) - collectedAmount(booking), 0);
  }

  async function loadSummary() {
    const response = await api('/bookings/admin/summary');
    const d = response.data || {};
    $('stat-total').textContent = d.totalBookings || 0;
    $('stat-collected').textContent = money(d.amountCollected);
    $('stat-balance').textContent = money(d.balanceOutstanding);
    $('stat-full').textContent = d.fullyPaidBookings || 0;
    $('stat-partial').textContent = d.partiallyPaidBookings || 0;
    $('stat-upcoming').textContent = d.upcomingBookings || 0;
  }

  function addCell(row, content, className) {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    if (content instanceof Node) cell.append(content);
    else cell.textContent = content;
    row.append(cell);
    return cell;
  }

  function makeText(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = content;
    return element;
  }

  function renderBookings(bookings) {
    const tbody = $('booking-rows');
    tbody.replaceChildren();
    if (!bookings.length) {
      const row = document.createElement('tr');
      const cell = addCell(row, 'No bookings match these filters.', 'empty-state');
      cell.colSpan = 11;
      tbody.append(row);
      return;
    }

    bookings.forEach((booking) => {
      const row = document.createElement('tr');
      const client = booking.user || booking.clientDetails || {};
      const pkg = booking.package || {};
      const clientBlock = document.createElement('div');
      clientBlock.append(
        makeText('span', 'client-name', client.name || 'Unknown client'),
        makeText('span', 'client-email', client.email || 'No email recorded'),
        makeText('span', 'client-phone', client.phoneNumber || 'No phone recorded'),
      );
      addCell(row, clientBlock);

      const source = booking.bookingSource || 'online';
      addCell(row, makeText('span', `source-badge source-${source}`, source === 'offline' ? 'Offline' : 'Online'));
      addCell(row, pkg.name || 'Package unavailable');
      addCell(row, date(booking.eventDate));

      const eventLocation = booking.eventLocation || {};
      const locationBlock = document.createElement('div');
      locationBlock.className = 'event-location-block';
      locationBlock.append(makeText('strong', 'event-location-name', eventLocation.venueName || 'Address not recorded'));
      const addressLines = [
        eventLocation.addressLine,
        eventLocation.locality,
        eventLocation.district,
        eventLocation.state,
        eventLocation.pinCode ? `PIN ${eventLocation.pinCode}` : '',
        eventLocation.landmark ? `Landmark: ${eventLocation.landmark}` : '',
        eventLocation.country || (eventLocation.venueName ? 'India' : ''),
      ].filter(Boolean);
      if (addressLines.length) locationBlock.append(makeText('span', 'event-location-address', addressLines.join(', ')));
      addCell(row, locationBlock, 'event-location-cell');

      addCell(row, money(booking.price));
      addCell(row, money(collectedAmount(booking)));
      addCell(row, money(outstandingBalance(booking)));

      const paymentStatus = booking.paymentStatus || 'pending';
      const statusLabel = paymentStatus.replace(/_/g, ' ');
      const paymentBlock = document.createElement('div');
      paymentBlock.append(makeText('span', `status status-${paymentStatus}`, statusLabel));
      if (booking.initialPaymentChoice) {
        paymentBlock.append(makeText('small', 'payment-choice-note', booking.initialPaymentChoice === 'full' ? 'Full payment chosen' : '20% advance chosen'));
      }
      addCell(row, paymentBlock);

      const contactCell = document.createElement('td');
      const contactActions = document.createElement('div');
      contactActions.className = 'contact-actions';
      if (client.email) {
        const emailLink = document.createElement('a');
        emailLink.className = 'contact-link';
        emailLink.href = `mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent('Radha Rani Studio booking')}`;
        emailLink.textContent = 'Email client ↗';
        contactActions.append(emailLink);
      }
      if (client.phoneNumber) {
        const phoneDigits = String(client.phoneNumber).replace(/\D/g, '');
        const whatsappNumber = phoneDigits.startsWith('91') ? phoneDigits : `91${phoneDigits.replace(/^0/, '')}`;
        const callLink = document.createElement('a');
        callLink.className = 'contact-link';
        callLink.href = `tel:+${whatsappNumber}`;
        callLink.textContent = 'Call client';
        const whatsappLink = document.createElement('a');
        whatsappLink.className = 'contact-link';
        whatsappLink.href = `https://wa.me/${whatsappNumber}`;
        whatsappLink.target = '_blank';
        whatsappLink.rel = 'noopener noreferrer';
        whatsappLink.textContent = 'WhatsApp ↗';
        contactActions.append(callLink, whatsappLink);
      }
      if (contactActions.childElementCount) contactCell.append(contactActions);
      else contactCell.textContent = 'No contact details';
      row.append(contactCell);

      const actionCell = document.createElement('td');
      if (outstandingBalance(booking) > 0 && paymentStatus === 'partially_paid') {
        const paymentButton = document.createElement('button');
        paymentButton.type = 'button';
        paymentButton.className = 'table-action-btn';
        paymentButton.textContent = 'Record payment';
        paymentButton.addEventListener('click', () => openPaymentModal(booking));
        actionCell.append(paymentButton);
      } else {
        actionCell.textContent = paymentStatus === 'paid' ? 'Complete' : '—';
      }
      row.append(actionCell);
      tbody.append(row);
    });
  }

  async function loadBookings() {
    const params = new URLSearchParams({ page: String(state.page), limit: '50' });
    if ($('status-filter').value) params.set('paymentStatus', $('status-filter').value);
    if ($('source-filter').value) params.set('bookingSource', $('source-filter').value);
    if ($('from-date').value) params.set('from', $('from-date').value);
    if ($('to-date').value) params.set('to', $('to-date').value);
    const response = await api(`/bookings/admin/all?${params}`);
    state.pages = response.pages || 1;
    state.bookings = response.data?.bookings || [];
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
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        showLogin(error.message);
      } else setFeedback(error.message);
    } finally {
      $('refresh-btn').disabled = false;
    }
  }

  async function loadPackagesForOfflineForm() {
    if (state.packages.length) return;
    $('offline-package').innerHTML = '<option value="">Loading packages…</option>';
    const response = await api('/packages');
    state.packages = response.data?.packages || [];
    $('offline-package').innerHTML = '<option value="">Select photography package</option>';
    state.packages.forEach((pkg) => {
      const option = document.createElement('option');
      option.value = pkg._id;
      option.textContent = `${pkg.name} — ${money(pkg.price)}`;
      $('offline-package').append(option);
    });
  }

  function updateOfflinePricePreview() {
    const pkg = state.packages.find((item) => item._id === $('offline-package').value);
    if (!pkg) {
      $('offline-package-price').textContent = '—';
      $('offline-initial-payment-amount').textContent = '—';
      $('offline-balance-due').textContent = '—';
      return;
    }
    const price = Number(pkg.price) || 0;
    const advance = Math.round((price * 0.2 + Number.EPSILON) * 100) / 100;
    const paymentChoice = $('offline-payment-choice').value || 'advance';
    const initialPaymentAmount = paymentChoice === 'full' ? price : advance;
    $('offline-package-price').textContent = money(price);
    $('offline-initial-payment-label').textContent = paymentChoice === 'full' ? 'Full payment received now' : '20% advance received now';
    $('offline-initial-payment-amount').textContent = money(initialPaymentAmount);
    $('offline-balance-due').textContent = money(Math.max(price - initialPaymentAmount, 0));
  }

  function closeOfflineModal() {
    $('offline-booking-modal').hidden = true;
    $('offline-booking-form').reset();
    setFeedback('', 'offline-booking-feedback');
    updateOfflinePricePreview();
  }

  async function openOfflineModal() {
    setFeedback('', 'offline-booking-feedback');
    $('offline-booking-form').reset();
    $('offline-event-date').min = todayIndia();
    $('offline-payment-choice').value = 'advance';
    $('offline-booking-modal').hidden = false;
    try {
      await loadPackagesForOfflineForm();
      updateOfflinePricePreview();
      $('offline-customer-name').focus();
    } catch (error) {
      setFeedback(error.message, 'offline-booking-feedback');
    }
  }

  function openPaymentModal(booking) {
    const due = outstandingBalance(booking);
    $('record-payment-form').reset();
    $('payment-booking-id').value = booking._id;
    $('record-payment-amount').value = due.toFixed(2);
    $('record-payment-amount').max = due.toFixed(2);
    $('payment-modal-context').textContent = `${(booking.user || booking.clientDetails || {}).name || 'Customer'} · Remaining balance ${money(due)}`;
    setFeedback('', 'record-payment-feedback');
    $('payment-modal').hidden = false;
    $('record-payment-amount').focus();
  }

  function closePaymentModal() {
    $('payment-modal').hidden = true;
    $('record-payment-form').reset();
    setFeedback('', 'record-payment-feedback');
  }

  $('admin-login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    setFeedback('Signing in…', 'login-feedback');
    try {
      const response = await fetch(`${API}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: $('admin-email').value.trim(), password: $('admin-password').value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Sign in failed.');
      if (data.data?.user?.role !== 'admin') throw new Error('This account is not an administrator. Ask the site owner to grant admin access.');
      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', data.data.user.role);
      localStorage.setItem('userName', data.data.user.name || 'Administrator');
      showDashboard();
      await refresh();
    } catch (error) {
      setFeedback(error.message, 'login-feedback');
    } finally {
      button.disabled = false;
    }
  });

  $('refresh-btn').addEventListener('click', refresh);
  $('logout-btn').addEventListener('click', () => {
    ['token', 'userRole', 'userName', 'userEmail'].forEach((key) => localStorage.removeItem(key));
    $('admin-password').value = '';
    showLogin('You have been logged out.');
  });

  ['status-filter', 'source-filter', 'from-date', 'to-date'].forEach((id) => {
    $(id).addEventListener('change', () => {
      state.page = 1;
      loadBookings().catch((error) => setFeedback(error.message));
    });
  });
  $('clear-filters').addEventListener('click', () => {
    $('status-filter').value = '';
    $('source-filter').value = '';
    $('from-date').value = '';
    $('to-date').value = '';
    $('search-input').value = '';
    state.page = 1;
    loadBookings().catch((error) => setFeedback(error.message));
  });
  $('search-input').addEventListener('input', () => {
    const term = $('search-input').value.trim().toLowerCase();
    const filtered = state.bookings.filter((booking) => {
      const client = booking.user || booking.clientDetails || {};
      const location = booking.eventLocation || {};
      const values = [
        client.name, client.email, client.phoneNumber,
        booking.package?.name, booking.bookingSource,
        location.venueName, location.addressLine, location.locality,
        location.district, location.state, location.pinCode, location.landmark,
      ];
      return values.some((value) => String(value || '').toLowerCase().includes(term));
    });
    renderBookings(filtered);
  });
  $('prev-page').addEventListener('click', () => {
    if (state.page > 1) { state.page -= 1; refresh(); }
  });
  $('next-page').addEventListener('click', () => {
    if (state.page < state.pages) { state.page += 1; refresh(); }
  });

  $('add-offline-booking-btn').addEventListener('click', openOfflineModal);
  $('close-offline-modal').addEventListener('click', closeOfflineModal);
  $('cancel-offline-booking').addEventListener('click', closeOfflineModal);
  $('offline-booking-modal').addEventListener('click', (event) => {
    if (event.target === $('offline-booking-modal')) closeOfflineModal();
  });
  $('offline-package').addEventListener('change', updateOfflinePricePreview);
  $('offline-payment-choice').addEventListener('change', updateOfflinePricePreview);
  $('offline-booking-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const submitButton = $('save-offline-booking');
    submitButton.disabled = true;
    setFeedback('Saving offline booking and reserving the date…', 'offline-booking-feedback');
    const formData = new FormData(event.currentTarget);
    const eventLocation = {
      venueName: String(formData.get('venueName') || '').trim(),
      addressLine: String(formData.get('addressLine') || '').trim(),
      locality: String(formData.get('locality') || '').trim(),
      district: String(formData.get('district') || '').trim(),
      state: String(formData.get('state') || '').trim(),
      pinCode: String(formData.get('pinCode') || '').trim(),
      landmark: String(formData.get('landmark') || '').trim(),
      country: 'India',
    };
    const payload = {
      customerName: String(formData.get('customerName') || '').trim(),
      phoneNumber: String(formData.get('phoneNumber') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      packageId: String(formData.get('packageId') || ''),
      eventDate: String(formData.get('eventDate') || ''),
      eventLocation,
      paymentMethod: String(formData.get('paymentMethod') || ''),
      paymentChoice: String(formData.get('paymentChoice') || 'advance'),
      paymentReference: String(formData.get('paymentReference') || '').trim(),
      adminNotes: String(formData.get('adminNotes') || '').trim(),
      advancePolicyAccepted: formData.get('advancePolicyAccepted') === 'on',
    };
    try {
      const response = await api('/bookings/admin/offline', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      closeOfflineModal();
      state.page = 1;
      await refresh();
      setFeedback(response.message || 'Offline booking saved and the selected initial payment has been recorded.')
    } catch (error) {
      setFeedback(error.message, 'offline-booking-feedback');
    } finally {
      submitButton.disabled = false;
    }
  });

  $('close-payment-modal').addEventListener('click', closePaymentModal);
  $('cancel-record-payment').addEventListener('click', closePaymentModal);
  $('payment-modal').addEventListener('click', (event) => {
    if (event.target === $('payment-modal')) closePaymentModal();
  });
  $('record-payment-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    setFeedback('Saving payment…', 'record-payment-feedback');
    const formData = new FormData(event.currentTarget);
    const payload = {
      amount: Number(formData.get('amount')),
      paymentMethod: String(formData.get('paymentMethod') || ''),
      referenceId: String(formData.get('referenceId') || '').trim(),
      note: String(formData.get('note') || '').trim(),
    };
    try {
      await api(`/bookings/admin/${encodeURIComponent($('payment-booking-id').value)}/payments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      closePaymentModal();
      await refresh();
      setFeedback('Payment recorded successfully. The outstanding balance has been updated.');
    } catch (error) {
      setFeedback(error.message, 'record-payment-feedback');
    } finally {
      submitButton.disabled = false;
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!$('offline-booking-modal').hidden) closeOfflineModal();
      if (!$('payment-modal').hidden) closePaymentModal();
    }
  });

  if (token() && localStorage.getItem('userRole') === 'admin') {
    showDashboard();
    refresh();
  } else showLogin();
})();
