# Rolence Money Tracker

A premium, fintech-style personal finance dashboard that runs entirely in your browser. Track your balance, log expenses, and see your spending broken down with live charts — no backend, no database, no build step.

![Tech](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20Vanilla%20JS-003A70)

---

## Overview

Rolence Money Tracker is a single-page web app built with plain HTML, CSS, and JavaScript. On first visit it asks for your name and starting balance, then gives you a banking-style dashboard — complete with a virtual balance card, spending statistics, charts, and a full transaction ledger. Every figure (balance, totals, charts, table) updates instantly whenever you add, edit, or delete an expense. All data is saved to your browser's `localStorage`, so it's still there the next time you open the page.

## Features

- **First-time setup** — capture your name and starting balance once; it's remembered after that.
- **Virtual balance card** — a glassmorphic, animated card (the dashboard's signature piece) that always shows `Initial balance − Total expenses`, with a shimmer effect whenever the balance changes.
- **Dashboard widgets** — total spent, transaction count, largest expense, and average spend per transaction, each with hover and update animations.
- **Add / edit / delete expenses** — a validated form (name, category, amount, date) with inline error messages; deleting a transaction restores the amount to your balance automatically.
- **Transaction history** — searchable, filterable by category, sortable by date or amount, and paginated.
- **Charts (Chart.js)** — spending by category (doughnut), 7-day spending trend (bar), and a full monthly expense analysis for the current year.
- **Category breakdown** — a ranked list of categories with progress bars and percentages.
- **Dark mode** — toggle from the sidebar or Settings; your choice is remembered.
- **Export / import** — download your transactions as CSV, back up everything as JSON, and restore from a JSON backup.
- **Toast notifications** — for additions, edits, deletions, exports, theme changes, and errors.
- **Empty states** — friendly prompts when there's no data yet, instead of a blank screen.
- **Keyboard shortcuts** — `N` add expense, `/` jump to search, `D` toggle dark mode, `Esc` close dialogs.
- **Fully responsive** — collapsible sidebar and reflowed layout down to mobile widths.

## Installation

No build tools or package installs are required.

1. Download or clone this project.
2. Keep the folder structure intact (see below) — `index.html` expects `css/style.css` and `js/script.js` at their relative paths.

## How to run

**Recommended — VS Code Live Server:**
1. Open the `MoneyTracker` folder in VS Code.
2. Install the **Live Server** extension if you don't have it.
3. Right-click `index.html` → **Open with Live Server**.

**Alternative — any local web server:**
```bash
cd MoneyTracker
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

> Opening `index.html` directly via `file://` generally works too, but a local server avoids any browser restrictions around `fetch`/storage and is the more reliable option.

## Folder structure

```
MoneyTracker/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── assets/
│   ├── icons/
│   └── images/
└── README.md
```

## Technologies used

| Layer       | Technology                                   |
|-------------|-----------------------------------------------|
| Structure   | HTML5                                          |
| Styling     | CSS3 (custom properties, Grid, Flexbox, glassmorphism, keyframe animations) |
| Behavior    | Vanilla JavaScript (ES6+, modules-free IIFE)   |
| Charts      | [Chart.js](https://www.chartjs.org/) via CDN  |
| Fonts       | Sora (display), Inter (body), JetBrains Mono (figures) via Google Fonts |
| Storage     | Browser `localStorage` — no server, no database |

## Data & privacy

Everything you enter stays in your browser. Nothing is sent to a server. Clearing your browser's site data (or using "Clear all data" in Settings) removes it permanently — export a JSON backup first if you want to keep a copy.

## Notes

- Currency is labeled `TZS` to match the original brief; you can change this in `js/script.js` by editing the `CURRENCY` constant.
- Categories are fixed to: Food, Transport, Shopping, Education, Entertainment, Utilities, Health, Savings, Other.
