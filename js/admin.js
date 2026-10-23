/* =====================================================
   admin.js  -  admin panel (admin.html)
   Demo login only: admin / admin123
   (A real site must check the password on a server.)
   ===================================================== */
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

// ---------- Login ----------
function showDash(loggedIn) {
  $('loginBox').hidden = loggedIn;
  $('dash').hidden = !loggedIn;
  if (loggedIn) renderAll();
}

$('loginBtn').onclick = () => {
  if ($('user').value.trim() === ADMIN_USER && $('pass').value === ADMIN_PASS) {
    sessionStorage.setItem('tb_admin', '1');
    $('loginMsg').textContent = '';
    showDash(true);
  } else {
    $('loginMsg').textContent = 'Wrong username or password.';
  }
};
$('pass').onkeydown = e => { if (e.key === 'Enter') $('loginBtn').click(); };
$('logoutBtn').onclick = () => { sessionStorage.removeItem('tb_admin'); $('pass').value = ''; showDash(false); };

// ---------- Filters ----------
function filtered() {
  const d = $('fDate').value, t = $('fTurf').value, s = $('fStatus').value;
  const q = $('fSearch').value.trim().toLowerCase();
  return getBookings()
    .filter(b => (!d || b.date === d) && (!t || b.turf === t) && (!s || b.status === s))
    .filter(b => !q || (b.name + ' ' + b.phone + ' ' + b.ref).toLowerCase().includes(q))
    .sort((a, b) => (b.date + pad(b.hour)).localeCompare(a.date + pad(a.hour)));
}

// ---------- Rendering ----------
function renderStats() {
  const all = getBookings().filter(b => b.status === 'Confirmed' && !b.blocked);
  const today = ymd(new Date());
  const sum = list => list.reduce((s, b) => s + b.amount, 0);
  const cards = [
    ['Total bookings', all.length],
    ["Today's bookings", all.filter(b => b.date === today).length],
    ['Payment received', '₹' + sum(all.filter(b => b.payStatus === 'Paid'))],
    ['Cash pending', '₹' + sum(all.filter(b => b.payStatus === 'Pending'))]
  ];
  $('stats').innerHTML = cards.map(([label, value]) =>
    `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join('');
}

function badge(text) {
  const cls = text === 'Paid' || text === 'Confirmed' ? 'ok'
            : text === 'Pending' || text === 'Refund due' ? 'warn'
            : text === 'Cancelled' ? 'bad' : '';
  return `<span class="badge ${cls}">${esc(text)}</span>`;
}

function renderRows() {
  const list = filtered();
  $('rows').innerHTML = list.length ? list.map(b => {
    const actions = [];
    if (b.status === 'Confirmed' && b.payStatus === 'Pending') actions.push(`<button class="mini ok" data-act="paid" data-id="${b.id}">Mark paid</button>`);
    if (b.status === 'Confirmed') actions.push(`<button class="mini bad" data-act="cancel" data-id="${b.id}">${b.blocked ? 'Unblock' : 'Cancel'}</button>`);
    return `<tr>
      <td>${b.blocked ? '-' : b.ref}</td>
      <td>${esc(b.name)}<br><small>${esc(b.phone)}</small></td>
      <td>${turfById(b.turf).name}</td>
      <td>${b.date}</td>
      <td>${range(b.hour)}</td>
      <td>₹${b.amount}</td>
      <td>${b.blocked ? '-' : esc(b.method) + '<br>' + badge(b.payStatus)}</td>
      <td>${badge(b.status)}</td>
      <td>${actions.join(' ')}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="9" class="empty">No bookings match these filters.</td></tr>';
}

function renderAll() { renderStats(); renderRows(); }

// Buttons inside the table (event delegation)
$('rows').onclick = e => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.act === 'paid') {
    const all = getBookings();
    const b = all.find(x => x.id === id);
    if (b) { b.payStatus = 'Paid'; b.txn = 'CASH-' + uid().toUpperCase(); saveBookings(all); }
  }
  if (btn.dataset.act === 'cancel') {
    if (!confirm('Cancel this booking? The slot becomes available again.')) return;
    cancelBooking(id);
  }
  renderAll();
};

['fDate', 'fTurf', 'fStatus'].forEach(id => $(id).onchange = renderRows);
$('fSearch').oninput = renderRows;
$('clearBtn').onclick = () => {
  ['fDate', 'fTurf', 'fStatus', 'fSearch'].forEach(id => $(id).value = '');
  renderRows();
};

// ---------- CSV download ----------
$('csvBtn').onclick = () => {
  const head = ['Ref', 'Name', 'Phone', 'Turf', 'Date', 'Time', 'Amount', 'Method', 'Payment status', 'Booking status'];
  const cell = v => '"' + String(v).replace(/"/g, '""') + '"';
  const lines = filtered().map(b => [b.ref, b.name, b.phone, turfById(b.turf).name, b.date,
    range(b.hour), b.amount, b.method, b.payStatus, b.status].map(cell).join(','));
  const blob = new Blob([[head.map(cell).join(',')].concat(lines).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bookings-' + ymd(new Date()) + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
};

// ---------- Block slots ----------
function fillBlockForm() {
  $('fTurf').innerHTML += TURFS.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  $('bTurf').innerHTML = TURFS.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  let opts = '';
  for (let h = FIRST; h <= LAST; h++) opts += `<option value="${h}">${range(h)}</option>`;
  $('bFrom').innerHTML = opts;
  $('bTo').innerHTML = opts;
  $('bTo').value = LAST;
  $('bDate').value = ymd(new Date());
  $('bDate').min = ymd(new Date());
}

$('blockBtn').onclick = () => {
  const msg = $('blockMsg');
  const t = turfById($('bTurf').value), d = $('bDate').value;
  const from = Number($('bFrom').value), to = Number($('bTo').value);
  msg.className = 'msg err';
  if (!d) { msg.textContent = 'Pick a date.'; return; }
  if (to < from) { msg.textContent = '"To" must be the same as or later than "From".'; return; }

  const all = getBookings();
  let added = 0, skipped = 0;
  for (let h = from; h <= to; h++) {
    if (isBooked(t, d, h) || slotStatus(t, d, h) === 'past') { skipped++; continue; }
    all.push({
      id: uid(), ref: '-', turf: t.id, date: d, hour: h, name: 'Blocked (maintenance)', phone: '-',
      method: '-', payInfo: '', txn: '', payStatus: '-', amount: 0,
      status: 'Confirmed', blocked: true, createdAt: new Date().toISOString()
    });
    added++;
  }
  saveBookings(all);
  msg.className = 'msg ok';
  msg.textContent = `Blocked ${added} slot${added === 1 ? '' : 's'}.` + (skipped ? ` Skipped ${skipped} (already booked or time over).` : '');
  renderAll();
};

// ---------- Reset ----------
$('resetBtn').onclick = () => {
  if (!confirm('Delete ALL bookings and restore the demo bookings?')) return;
  localStorage.removeItem('tb_bookings');
  localStorage.removeItem('tb_seeded');
  seedDemo();
  renderAll();
};

// ---------- Start ----------
fillBlockForm();
showDash(sessionStorage.getItem('tb_admin') === '1');
window.addEventListener('storage', () => { if (!$('dash').hidden) renderAll(); });
