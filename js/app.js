/* =====================================================
   app.js  -  customer booking page (index.html)
   ===================================================== */
let turf = TURFS[0];
let date = ymd(new Date());
let selected = new Set();
let method = 'UPI';

// ---------- Rendering ----------
function renderTurfs() {
  $('turfs').innerHTML = TURFS.map(t =>
    `<button class="turf-btn" data-id="${t.id}" aria-pressed="${t.id === turf.id}">
       <strong>${t.name}</strong><span>₹${t.price}/hour · ${t.info}</span>
     </button>`).join('');
  document.querySelectorAll('.turf-btn').forEach(b => b.onclick = () => {
    turf = turfById(b.dataset.id);
    selected.clear();
    renderAll();
  });
}

function renderGrid() {
  let html = '';
  const names = { free: 'Available', booked: 'Booked', playing: 'Playing now', past: 'Time over' };
  for (let h = FIRST; h <= LAST; h++) {
    const s = slotStatus(turf, date, h);
    const sel = selected.has(h);
    html += `<button class="slot ${sel ? 'sel' : s}" data-h="${h}" ${s === 'free' ? '' : 'disabled'} aria-pressed="${sel}">
      ${range(h)}<small>${sel ? 'Selected' : names[s]} · ₹${price(turf, h)}</small></button>`;
  }
  $('grid').innerHTML = html;
  document.querySelectorAll('.slot').forEach(b => b.onclick = () => {
    const h = Number(b.dataset.h);
    selected.has(h) ? selected.delete(h) : selected.add(h);
    setMsg('');
    renderGrid();
    renderSummary();
  });
}

function totalAmount() {
  return [...selected].reduce((sum, h) => sum + price(turf, h), 0);
}

function renderSummary() {
  const hrs = [...selected].sort((a, b) => a - b);
  $('summary').className = hrs.length ? '' : 'empty';
  $('summary').innerHTML = hrs.length
    ? `<strong>${turf.name}</strong> on ${date}<br>` + hrs.map(h => `${range(h)} — ₹${price(turf, h)}`).join('<br>')
    : 'No slots selected yet.';
  $('total').textContent = '₹' + totalAmount();
  updatePayBtn();
}

function updatePayBtn() {
  const btn = $('payBtn');
  btn.disabled = selected.size === 0;
  btn.textContent = method === 'Cash' ? 'Confirm booking (pay at turf)' : `Pay ₹${totalAmount()}`;
}

function renderMine() {
  const list = getBookings()
    .filter(b => b.status === 'Confirmed' && !b.blocked)
    .sort((a, b) => (a.date + pad(a.hour)).localeCompare(b.date + pad(b.hour)));
  $('mine').innerHTML = list.length ? list.map(b => `
    <li class="bk">
      <div>
        <strong>${turfById(b.turf).name}</strong> <span class="badge ${b.payStatus === 'Paid' ? 'ok' : 'warn'}">${esc(b.payStatus)}</span><br>
        ${b.date}, ${range(b.hour)}<br>
        ${esc(b.name)} · ${esc(b.method)} · ₹${b.amount} · Ref ${b.ref}
      </div>
      ${slotInFuture(b) ? `<button class="cancel" data-id="${b.id}">Cancel</button>` : ''}
    </li>`).join('')
    : '<li class="empty">No bookings yet. Confirmed slots will show here.</li>';
  document.querySelectorAll('#mine .cancel').forEach(b => b.onclick = () => {
    if (confirm('Cancel this booking?')) { cancelBooking(b.dataset.id); renderAll(); }
  });
}

function renderAll() { renderTurfs(); renderGrid(); renderSummary(); renderMine(); }

function setMsg(text, type = '') {
  $('msg').textContent = text;
  $('msg').className = 'msg ' + type;
}

// ---------- Payment method tabs ----------
document.querySelectorAll('input[name=method]').forEach(r => r.onchange = () => {
  method = r.value;
  ['UPI', 'Card', 'Cash'].forEach(m => $('panel-' + m).hidden = (m !== method));
  setMsg('');
  updatePayBtn();
});

// Auto-format card number (4242 4242 ...) and expiry (MM/YY)
$('cardNo').oninput = e => {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
};
$('cardExp').oninput = e => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 4);
  if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
  e.target.value = v;
};
$('cardCvv').oninput = e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3); };
$('phone').oninput = e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10); };

// ---------- Validation ----------
function luhn(num) {            // standard card-number checksum
  let sum = 0, dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return sum % 10 === 0;
}

// Returns an error message, or '' if everything is fine
function validate() {
  const name = $('name').value.trim(), phone = $('phone').value.trim();
  if (name.length < 2) return 'Enter your name.';
  if (!/^[6-9]\d{9}$/.test(phone)) return 'Enter a valid 10-digit phone number.';

  if (method === 'UPI') {
    if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test($('upiId').value.trim())) return 'Enter a valid UPI ID, like name@bank.';
  }
  if (method === 'Card') {
    const num = $('cardNo').value.replace(/\s/g, '');
    if (num.length !== 16 || !luhn(num)) return 'Enter a valid 16-digit card number.';
    if ($('cardName').value.trim().length < 2) return 'Enter the name on the card.';
    const m = /^(\d{2})\/(\d{2})$/.exec($('cardExp').value);
    if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return 'Enter expiry as MM/YY.';
    const now = new Date();
    const expired = Number('20' + m[2]) < now.getFullYear() ||
                    (Number('20' + m[2]) === now.getFullYear() && Number(m[1]) < now.getMonth() + 1);
    if (expired) return 'This card has expired.';
    if (!/^\d{3}$/.test($('cardCvv').value)) return 'Enter the 3-digit CVV.';
  }
  return '';
}

// ---------- Pay and book ----------
// Pretend payment gateway: waits a moment and always succeeds (demo).
function fakeGateway() {
  return new Promise(resolve => setTimeout(() => resolve('TXN' + uid().toUpperCase()), 1200));
}

$('payBtn').onclick = async () => {
  const error = validate();
  if (error) { setMsg(error, 'err'); return; }

  const btn = $('payBtn');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  const txn = method === 'Cash' ? '' : await fakeGateway();

  // Re-check: someone may have booked the same slot while we were "paying"
  const hours = [...selected].sort((a, b) => a - b);
  if (hours.some(h => slotStatus(turf, date, h) !== 'free')) {
    selected.clear(); renderAll();
    setMsg('Some slots were just taken. Pick again.', 'err');
    return;
  }

  const payInfo = method === 'UPI' ? $('upiId').value.trim()
                : method === 'Card' ? 'Card •••• ' + $('cardNo').value.replace(/\s/g, '').slice(-4)   // never store full card number
                : 'Cash at turf';
  const ref = makeRef();
  const all = getBookings();
  const created = hours.map(h => ({
    id: uid(), ref, turf: turf.id, date, hour: h,
    name: $('name').value.trim(), phone: $('phone').value.trim(),
    method, payInfo, txn,
    payStatus: method === 'Cash' ? 'Pending' : 'Paid',
    amount: price(turf, h), status: 'Confirmed', blocked: false,
    createdAt: new Date().toISOString()
  }));
  saveBookings(all.concat(created));

  selected.clear();
  ['upiId', 'cardNo', 'cardName', 'cardExp', 'cardCvv'].forEach(id => $(id).value = '');
  renderAll();
  setMsg('');
  showReceipt(created);
};

// ---------- Receipt ----------
function showReceipt(items) {
  const f = items[0], total = items.reduce((s, b) => s + b.amount, 0);
  $('receiptBody').innerHTML = `
    <h2>Booking confirmed</h2>
    <p class="hint">Show this reference at the turf counter.</p>
    <table class="rc">
      <tr><td>Reference</td><td><strong>${f.ref}</strong></td></tr>
      <tr><td>Name</td><td>${esc(f.name)} (${esc(f.phone)})</td></tr>
      <tr><td>Turf</td><td>${turfById(f.turf).name}</td></tr>
      <tr><td>Date</td><td>${f.date}</td></tr>
      <tr><td>Slots</td><td>${items.map(b => range(b.hour)).join('<br>')}</td></tr>
      <tr><td>Payment</td><td>${esc(f.method)} · ${esc(f.payInfo)}</td></tr>
      <tr><td>Status</td><td>${f.payStatus === 'Paid' ? 'Paid (Txn ' + f.txn + ')' : 'Pay ₹' + total + ' in cash at the turf'}</td></tr>
      <tr><td>Total</td><td><strong>₹${total}</strong></td></tr>
    </table>`;
  $('receipt').showModal();
}
$('closeBtn').onclick = () => $('receipt').close();
$('printBtn').onclick = () => window.print();

// ---------- Start ----------
(function init() {
  const dEl = $('date'), max = new Date();
  max.setDate(max.getDate() + 30);
  dEl.value = date; dEl.min = date; dEl.max = ymd(max);
  dEl.onchange = () => {
    if (!dEl.value) return;
    date = dEl.value; selected.clear(); setMsg(''); renderAll();
  };
  renderAll();
  setInterval(() => { renderGrid(); renderSummary(); }, 60000);   // keeps "playing now" fresh
  window.addEventListener('storage', renderAll);                   // admin changed something in another tab
})();
