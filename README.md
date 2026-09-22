# BizFlow — Business Operations Management Platform

## Overview

BizFlow is a frontend prototype of a business operations dashboard, built to show how a small business, agency, or freelancer could manage customers, sales, invoices, expenses, and performance from a single, focused interface. It was designed and built as a portfolio case study for a Frontend Web Development + UI/UX Design role, to demonstrate a different product surface — a data-dense, business-facing SaaS tool — than a community/engineering platform.

The interface is built around one idea: a business owner should be able to see the health of their business and act on it in the same view, without digging through separate tools. The dashboard leads with the numbers that matter (revenue, sales, outstanding invoices, expenses), and every other section — customers, sales, invoices, expenses, analytics — follows the same patterns for search, filtering, and record management so the product feels coherent end to end.

## Features

- **Dashboard** — daily greeting, four KPI cards with month-over-month trend, a revenue chart, an outstanding invoices list, recent transactions, and quick-action shortcuts.
- **Customers** — searchable, filterable customer directory with add / edit / delete, computed total purchases and last activity, and validated forms.
- **Sales** — sales KPIs (total, today, monthly, average order value), a sales table with search and status filtering, and a New Sale form that auto-calculates subtotal, discount, tax, and total as you type.
- **Invoices** — invoice list with search and status filtering, a create/edit form with live totals, and a professional invoice preview modal with a working print/PDF view (via the browser's print dialog).
- **Expenses** — expense KPIs, category-colored badges, category filtering, and full CRUD with validation.
- **Analytics** — revenue-by-month and expense-by-category charts, sales performance summary, and a business summary that calculates estimated profit (revenue − expenses).
- **Notifications** — a notification panel with read/unread state, populated from real actions (new customers, new sales, overdue invoices) plus a couple of illustrative alerts.
- **Search & filtering** — instant, client-side search and filters on every data page, with helpful empty states.
- **Dark / light mode** — a persistent theme toggle that updates every chart, table, and form to match.
- **Responsive design** — a slide-in mobile navigation, stacking KPI cards, horizontally scrollable tables, and single-column forms and modals below 860px.
- **Settings** — editable business profile (used on invoices), currency, theme and notification preferences, and a "Reset demo data" option.
- **UX details** — hover/focus states, inline form validation, confirmation dialogs before every delete, toast notifications for success/error feedback, and consistent modal design throughout.

## Technologies

- HTML5
- CSS3 (custom properties for theming, CSS Grid & Flexbox, no framework)
- Vanilla JavaScript (ES5-compatible, no build step)
- Browser LocalStorage for persistence
- [Chart.js](https://www.chartjs.org/) (via CDN) for the revenue line chart and expense category doughnut chart
- Google Fonts (Manrope + Inter) for typography

No frameworks, bundlers, or backend — the entire app runs by opening `index.html`.

## UI/UX

BizFlow avoids the generic "SaaS card kit" look — instead of shadow-everywhere cards in a single accent color, it uses a deep teal (`#1F6F5C`) as the primary accent with a muted amber and brick-red for warnings and overdue states, flat bordered cards with a colored left-edge indicator on KPIs, and shadows reserved for overlays (modals, dropdowns, toasts) so they read as genuinely elevated. Manrope carries headings, navigation, and numbers with a confident geometric weight; Inter handles body copy and table data for long-form legibility.

The layout is a fixed sidebar + content shell on desktop, collapsing to a slide-in drawer on mobile. Every data page (Customers, Sales, Invoices, Expenses) shares the same toolbar → table → empty-state pattern so the product feels like one system rather than four separate screens. Responsive behavior is handled with CSS Grid/Flexbox reflow and horizontal scroll containers for tables, rather than hiding data outright.

## Data Handling

This is a **frontend-only prototype**. There is no backend, authentication server, payment processor, or real database. All data — customers, sales, invoices, expenses, and preferences — is generated as realistic demo data on first load and then persisted in the browser's `localStorage`. Changes you make (adding a customer, recording a sale, editing an invoice) are saved locally and will still be there the next time you open the app in the same browser. Use **Settings → Reset demo data** to restore the original sample data at any time.

## Project Structure

```
bizflow/
│
├── index.html
├── style.css
├── script.js
├── README.md
│
└── assets/
    ├── images/
    └── icons/
```

All icons are inline SVG (no external icon library), so the `assets/icons` folder is kept for any future custom assets.

## Running Locally

No installation or build step is required.

1. Download or clone this folder.
2. Open `index.html` directly in a modern browser (Chrome, Edge, Firefox, or Safari).

Optionally, serve it with any static server for a cleaner local URL, e.g.:

```bash
npx serve .
# or
python3 -m http.server
```

## Future Improvements

- A real backend API and database (e.g. Node/Express + PostgreSQL)
- User authentication and multi-user accounts
- Real payment integration (Stripe or similar)
- True PDF invoice generation and email delivery
- Cloud synchronization across devices
- Role-based access for teams (owner, staff, accountant)
- Real-time notifications via WebSockets

## Author

**Name:** MD SAIM MIA
Live link : https://saimworks00-sketch.github.io/bizflow/
