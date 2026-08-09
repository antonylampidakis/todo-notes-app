# Tasks & Notes

Το **Tasks & Notes** είναι μια web εφαρμογή προσωπικής οργάνωσης για τη
διαχείριση εργασιών, σημειώσεων, συμβάντων και ημερολογίου μέσα από ένα
ενιαίο περιβάλλον.

Η εφαρμογή έχει σχεδιαστεί ώστε να προσφέρει έναν απλό και οργανωμένο
τρόπο παρακολούθησης καθημερινών υποχρεώσεων και σημειώσεων.

## 🌐 Live εφαρμογή

Η εφαρμογή είναι διαθέσιμη στο:

https://tasks.antonylampidakis.com/

## ✨ Δυνατότητες

-   Δημιουργία και διαχείριση εργασιών
-   Παρακολούθηση ενεργών και ολοκληρωμένων εργασιών
-   Εντοπισμός εκπρόθεσμων εργασιών
-   Δημιουργία και διαχείριση σημειώσεων
-   Ημερολόγιο με προβολή ανά ημέρα και μήνα
-   Καταχώρηση συμβάντων στο ημερολόγιο
-   Συγκεντρωτικά στατιστικά στην αρχική οθόνη
-   Light / Dark mode
-   Responsive σχεδιασμός για διαφορετικά μεγέθη οθόνης
-   PWA υποστήριξη
-   Αυτόματη ενημέρωση της εφαρμογής μέσω Service Worker

## 🛠️ Τεχνολογίες

-   React
-   TypeScript
-   Vite
-   Vite PWA Plugin
-   HTML / CSS
-   GitHub Actions
-   GitHub Pages

## 📱 Progressive Web App

Το Tasks & Notes υποστηρίζει λειτουργίες **Progressive Web App (PWA)**.

Μπορεί να εγκατασταθεί σε συμβατές συσκευές και browsers και να
λειτουργεί περισσότερο σαν αυτόνομη εφαρμογή αντί για μια απλή
ιστοσελίδα.

## 🚀 Deployment

Το project φιλοξενείται μέσω **GitHub Pages**.

Το deployment πραγματοποιείται αυτόματα μέσω **GitHub Actions** μετά από
αλλαγές στον κώδικα.

### Production URL

https://tasks.antonylampidakis.com/

## 💻 Τοπική εκτέλεση

Για τοπική εκτέλεση του project:

``` bash
git clone https://github.com/antonylampidakis/todo-notes-app.git
cd todo-notes-app
npm install
npm run dev
```

Στη συνέχεια άνοιξε τη διεύθυνση που εμφανίζει το Vite στο terminal.

## 📦 Production Build

``` bash
npm run build
```

## 📂 Βασική δομή

``` text
todo-notes-app/
├── .github/
│   └── workflows/
├── public/
├── src/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🎯 Σκοπός

Το Tasks & Notes δημιουργήθηκε ως προσωπικό project με στόχο την
ανάπτυξη μιας πρακτικής εφαρμογής καθημερινής οργάνωσης και παράλληλα
την εξάσκηση στην ανάπτυξη σύγχρονων web εφαρμογών με React και
TypeScript.

## 👤 Developer

**Antonis Lampidakis**

GitHub: https://github.com/antonylampidakis
