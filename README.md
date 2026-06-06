# Threadworks SNS Storefront

Custom t-shirt business storefront with SNS Activewear product catalog,
built on Next.js + Supabase + Vercel. Includes a barter/trade inquiry system.

---

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Database**: Supabase (Postgres)
- **Hosting**: Vercel (auto-deploy from GitHub)
- **Data**: SNS Activewear Data Library (xlsx files)

---

## Project Structure

```
sns-storefront/
├── supabase/
│   └── schema.sql          ← Run this in Supabase SQL editor
├── scripts/
│   └── import_sns_data.py  ← One-time + weekly data import
├── data/                   ← Put your SNS xlsx files here
│   ├── Categories.xlsx
│   ├── Styles.xlsx
│   └── Products.xlsx
└── src/
    ├── app/
    │   ├── page.tsx                    ← Main storefront
    │   └── api/
    │       ├── products/route.ts       ← GET products list
    │       ├── products/[styleId]/     ← GET single style
    │       └── inquiries/route.ts      ← POST barter inquiry
    ├── components/
    │   ├── ProductCard.tsx
    │   ├── FilterBar.tsx
    │   └── InquiryModal.tsx
    └── lib/
        └── supabase.ts
```

---

## Setup: Step by Step

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/sns-storefront
cd sns-storefront
npm install
```

### 2. Create Supabase Project

1. Go to https://supabase.com → New project
2. Copy your **Project URL** and **anon key** from Settings → API
3. Also copy the **service_role key** (keep secret!)

### 3. Set Environment Variables

```bash
cp .env.local.example .env.local
# Then edit .env.local with your Supabase credentials
```

### 4. Create Database Tables

1. In Supabase dashboard → SQL Editor
2. Paste the contents of `supabase/schema.sql`
3. Click Run

### 5. Import SNS Data

```bash
# Place xlsx files in ./data folder
mkdir data
cp /path/to/SNS_Activewear_DataLibrary/*.xlsx data/

# Install Python deps
pip install pandas openpyxl supabase python-dotenv

# Run import (takes ~5-10 min for full catalog)
python scripts/import_sns_data.py
```

> **Tip**: Set `TSHIRT_ONLY = True` in the script to import only t-shirts
> and activewear (~10k styles instead of 200k). Recommended for storefront use.

### 6. Run Dev Server

```bash
npm run dev
# Open http://localhost:3000
```

### 7. Deploy to Vercel

```bash
# Push to GitHub
git add . && git commit -m "initial" && git push

# In Vercel dashboard:
# 1. Import your GitHub repo
# 2. Add environment variables from .env.local
# 3. Deploy
```

Your Vercel URL is what you link to from Barter Network.

---

## Daily Inventory Sync (via S&S API)

Inventory syncs automatically every day via the S&S REST API — no manual file downloads needed.

### How it works

| Schedule | Mode | What it does |
|----------|------|--------------|
| Every day at 4am UTC | `inventory` | Fetches live qty + prices for all SKUs. Fast (~30s). |
| Every Sunday | `full` | Also refreshes style metadata, new products, descriptions. |

### Setup

**1. Add secrets to GitHub** (repo → Settings → Secrets → Actions):

| Secret | Value |
|--------|-------|
| `SYNC_SECRET` | Same random string from your `.env.local` |
| `VERCEL_APP_URL` | Your deployed Vercel URL, e.g. `https://your-app.vercel.app` |

**2. Add the same env vars to Vercel** (project → Settings → Environment Variables):
- `SNS_ACCOUNT_NUMBER`
- `SNS_API_KEY`
- `SYNC_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

**3. Run sync_log.sql in Supabase** — creates the log table that tracks every sync run.

That's it. GitHub Actions will call `POST /api/sync` on schedule. You can monitor runs in the Actions tab, and view sync history in your Supabase `sync_log` table.

### Manual trigger

Trigger a sync anytime from the GitHub Actions UI (Actions tab → Daily SNS Inventory Sync → Run workflow), or via curl:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SYNC_SECRET" \
  "https://your-app.vercel.app/api/sync?mode=inventory"
```

---

## Customization

| What | Where |
|------|-------|
| Business name / logo | `src/app/page.tsx` → `.logo-name` |
| Hero text | `src/app/page.tsx` → `.hero` section |
| Categories shown | `src/app/page.tsx` → `CATEGORIES` array |
| Import all vs t-shirts only | `scripts/import_sns_data.py` → `TSHIRT_ONLY` |
| Warehouse filter | `scripts/import_sns_data.py` → `active_TX` |
| Colors / theme | CSS variables in each component |

---

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/products` | List styles with filters |
| GET | `/api/products/[styleId]` | Single style + all SKUs |
| POST | `/api/inquiries` | Submit barter offer |
| GET | `/api/inquiries?status=pending` | View inquiries (admin) |

---

## Barter Inquiry Flow

1. User browses catalog → clicks **"Make a Trade Offer"**
2. Modal opens → they fill in name, email, what they're offering
3. Inquiry saved to Supabase `inquiries` table
4. You review in Supabase dashboard (or build an admin page later)
5. Reach out directly to negotiate the trade
