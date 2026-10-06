# DROPS

**Digital Reading of Outflow & Payment Sync.** Every drop accounted for. Every payment synced.

Provincial water tariff and billing demo, built with React, Vite, Tailwind CSS, React Router, Recharts, Leaflet, and OpenStreetMap.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Use `npm run build` to create the production bundle in `dist/`.

## Demo workflow

Register a consumer, record a meter reading, generate a bill, and record a payment. Payment recording changes the bill to Paid and opens a printable receipt (allow pop-ups). Readings entered while the browser is offline are saved as Pending Sync and change to Synced after the browser reconnects.

Alerts follow the switches in Settings and on each consumer: readings at or above a consumer's warning point or monthly limit queue a usage alert, and new bills queue a bill-ready alert. Payment methods turned off in Settings disappear from the payment form. Renaming a tariff moves its consumers to the new name. Settings → System Preferences → Reset demo data restores the original dataset. Press Ctrl K (⌘ K on Mac) to search consumers.

All changes persist in browser LocalStorage. `src/services/storageService.js` is the storage boundary for replacing LocalStorage with an API later. Bill calculations live in `src/services/billingService.js`.

The dashboard's district-wide KPI totals and annual trends are presentation data. Record tables and transaction actions use the editable local demo dataset. SMS notifications are simulated; no messages are sent.

## Samar service map

The Service Area page (`/service-area`, in the sidebar) covers Samar Island, including Samar Province, Northern Samar, and Eastern Samar: 3 cities, 70 municipalities, and 2,117 barangays. Filter by province, switch between locality and barangay layers, select a city or municipality to drill in, then focus any barangay to inspect and edit its demo supply status. Consumer registration uses the same location list.

The boundaries are PSA/NAMRIA 2023 shapes. Barangays are the single source geometry, and localities and provinces are dissolved from them, so all levels share identical edges. Run `npm run build:geo` to rebuild them. See [boundary sources and processing](public/data/README.md). Map coverage colors and percentages are illustrative demo data, not measured water service or supply.
