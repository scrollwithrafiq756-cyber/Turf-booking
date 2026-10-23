# Turf Booking Website (Tennis & Cricket)

Plain HTML, CSS and JavaScript. No installs, no backend.

## Run in VS Code
1. Open the `turf-booking` folder in VS Code (File > Open Folder).
2. Install the **Live Server** extension (by Ritwick Dey).
3. Right-click `index.html` > **Open with Live Server**.
   (Double-clicking `index.html` also works, but Live Server is safer because both pages then share the same saved data.)

## Pages
- `index.html` - customers: choose turf and date, pick slots, pay by UPI / Card / Cash, get a receipt.
- `admin.html` - admin: login `admin` / `admin123`, see all bookings, mark cash as paid, cancel, block slots, download CSV.

## Slot colours
- Green = available
- Yellow = booked and playing right now
- Red = booked
- Grey = time is over

## Files
- `js/data.js` - turf prices, helpers, saving/loading bookings (localStorage)
- `js/app.js` - booking and payment logic
- `js/admin.js` - admin logic
- `css/style.css` - all styling

## Notes (for viva)
- Payments are simulated. No real money moves and the full card number is never saved (only the last 4 digits).
- Data lives in the browser (localStorage). A real system would use a server (PHP/Node) and a database (MySQL), with a payment gateway such as Razorpay and a secure admin login.
- Change prices or turfs at the top of `js/data.js`.
