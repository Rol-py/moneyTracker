# Deploying Rolence Money Tracker — for free

This app is pure HTML/CSS/JS with no backend, so any **static site host** works. All four options below have a permanent free tier with no credit card required and are enough to host this project forever at no cost (a custom domain name, if you want one instead of the host's free subdomain, is the only thing that ever costs money — typically ~$10–15/year, entirely optional).

Pick whichever feels easiest — GitHub Pages and Netlify are the simplest for beginners.

---

## Option 1: GitHub Pages (free forever, no account limits)

1. Create a free GitHub account at github.com if you don't have one.
2. Create a new repository (e.g. `money-tracker`) — public is fine.
3. Upload your `MoneyTracker` folder contents to the repo (drag-and-drop on the GitHub website works, or use git):
   ```bash
   cd MoneyTracker
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/money-tracker.git
   git push -u origin main
   ```
4. In the repo, go to **Settings → Pages**.
5. Under "Build and deployment", set **Source** to "Deploy from a branch", branch `main`, folder `/ (root)`.
6. Save. Your site goes live in 1–2 minutes at:
   `https://YOUR_USERNAME.github.io/money-tracker/`

---

## Option 2: Netlify (fastest — drag and drop, no git needed)

1. Go to app.netlify.com and sign up free.
2. Click **Add new site → Deploy manually**.
3. Drag your whole `MoneyTracker` folder onto the upload box.
4. Done — Netlify gives you a live URL immediately (e.g. `random-name-123.netlify.app`).
5. Optional: click **Site settings → Change site name** to pick a nicer free subdomain.

---

## Option 3: Vercel

1. Go to vercel.com and sign up free (you can use a GitHub account to sign in).
2. Click **Add New → Project**.
3. Either import the GitHub repo from Option 1, or drag-and-drop the folder if prompted.
4. Leave all build settings empty/default (it's a static site — no framework, no build command).
5. Deploy. You'll get a URL like `money-tracker.vercel.app`.

---

## Option 4: Cloudflare Pages

1. Go to dash.cloudflare.com → **Workers & Pages → Create → Pages**.
2. Connect your GitHub repo (from Option 1) or use **Direct upload** to drag-and-drop the folder.
3. Leave the build command empty and the output directory as `/`.
4. Deploy. You'll get a URL like `money-tracker.pages.dev`.

---

## Which should you pick?

| Host | Easiest for | Notes |
|---|---|---|
| **Netlify** | Total beginners | Drag-and-drop, no GitHub account required |
| **GitHub Pages** | People comfortable with GitHub | Free forever, simplest long-term home for a portfolio project |
| **Vercel** | Same as GitHub Pages | Very fast global CDN, great for sharing a polished link |
| **Cloudflare Pages** | Same as above | Cloudflare's CDN, generous free tier, very fast in Africa/Asia |

All four are genuinely free with no time limit and no hidden charges for a small static app like this one. None require a credit card to sign up.

## A note on your data

Your transactions and photo live in the browser's `localStorage`, tied to the device and browser you use. Deploying the app online doesn't change that — each visitor (including you, on different devices) starts with their own separate local data. If you want your data to follow you across devices, export a JSON backup (Settings → Data & backup) on one device and import it on another.
