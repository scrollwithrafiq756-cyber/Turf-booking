/* =====================================================
   data.js  -  shared by index.html and admin.html
   Holds turf settings, helpers and the "database"
   (browser localStorage).
   ===================================================== */

// ---------- Settings ----------
const TURFS = [
  { id: 'cricket', name: 'Cricket Turf', price: 1200, peak: 300, info: 'Box cricket, flood lights' },
  { id: 'tennis',  name: 'Tennis Turf',  price: 800,  peak: 200, info: 'Hard court, flood lights' }
];
const FIRST = 6;        // first slot starts at 6 AM
const LAST = 22;        // last slot starts at 10 PM (ends 11 PM)
const PEAK_FROM = 18;   // peak price from 6 PM

// ---------- Small helpers ----------
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hourLabel = h => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
const range = h => `${hourLabel(h)} - ${hourLabel(h + 1)}`;
const price = (t, h) => t.price + (h >= PEAK_FROM ? t.peak : 0);
const turfById = id => TURFS.find(t => t.id === id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const makeRef = () => 'TB' + Math.random().toString(36).slice(2, 8).toUpperCase();
// Escape text before putting it in HTML (stops script injection through names)
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Storage ----------
const Store = {
  get(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v === null ? fallback : v; }
    catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ }
  }
};
const getBookings = () => Store.get('tb_bookings', []);
const saveBookings = list => Store.set('tb_bookings', list);

/* A booking record looks like:
   { id, ref, turf, date, hour, name, phone,
     method: 'UPI' | 'Card' | 'Cash' | '-',
     payInfo, txn, payStatus: 'Paid' | 'Pending' | 'Refund due' | '-',
     amount, status: 'Confirmed' | 'Cancelled', blocked: true/false, createdAt }          */

// ---------- Slot status ----------
function isBooked(turf, date, hour) {
  return getBookings().some(b =>
    b.turf === turf.id && b.date === date && b.hour === hour && b.status !== 'Cancelled');
}

// Returns: 'past' | 'playing' | 'booked' | 'free'
function slotStatus(turf, date, hour) {
  const now = new Date(), today = ymd(now), booked = isBooked(turf, date, hour);
  if (date < today) return 'past';
  if (date === today) {
    if (hour < now.getHours()) return 'past';
    if (hour === now.getHours()) return booked ? 'playing' : 'free';
  }
  return booked ? 'booked' : 'free';
}

// Can the slot still be cancelled? (only before it starts)
function slotInFuture(b) {
  return new Date(`${b.date}T${pad(b.hour)}:00:00`) > new Date();
}

function cancelBooking(id) {
  const all = getBookings();
  const b = all.find(x => x.id === id);
  if (!b) return;
  b.status = 'Cancelled';
  if (b.payStatus === 'Paid') b.payStatus = 'Refund due';
  else if (b.payStatus === 'Pending') b.payStatus = '-';
  saveBookings(all);
}

// ---------- Demo data (created only the first time) ----------
function seedDemo() {
  if (Store.get('tb_seeded', false)) return;
  const now = new Date(), today = ymd(now), h = now.getHours();
  const t = new Date(now); t.setDate(now.getDate() + 1);
  const tomorrow = ymd(t);
  const mk = (turf, date, hour, name, method, payStatus) => ({
    id: uid(), ref: makeRef(), turf, date, hour, name, phone: '9876543210',
    method, payInfo: method === 'Cash' ? 'Cash at turf' : 'Demo', txn: payStatus === 'Paid' ? 'TXN' + uid().toUpperCase() : '',
    payStatus, amount: price(turfById(turf), hour), status: 'Confirmed', blocked: false, createdAt: new Date().toISOString()
  });
  const list = [];
  if (h >= FIRST && h <= LAST) list.push(mk('cricket', today, h, 'Aarav (demo)', 'UPI', 'Paid'));          // shows YELLOW
  [h + 2, h + 3].filter(x => x >= FIRST && x <= LAST)
    .forEach(x => list.push(mk('cricket', today, x, 'Sahil (demo)', 'Cash', 'Pending')));                   // shows RED
  [18, 19, 20].forEach(x => list.push(mk('tennis', tomorrow, x, 'Rohan (demo)', 'Card', 'Paid')));
  [7, 8].forEach(x => list.push(mk('cricket', tomorrow, x, 'Team Blasters (demo)', 'UPI', 'Paid')));
  saveBookings(list);
  Store.set('tb_seeded', true);
}
seedDemo();
