# Kupal – barkada photo wall

Static site (HTML/CSS/JS) + Supabase (database + storage) + Cloudflare Pages (hosting).

## 1. Supabase
1. Create a project at supabase.com.
2. SQL Editor → paste and run `schema.sql`.
3. Authentication → Sign In / Providers → turn on **Allow anonymous sign-ins**.
4. Project Settings → API → copy the **Project URL** and **anon public key** into `config.js`.

## 2. GitHub
```bash
git init
git add .
git commit -m "Kupal photo wall"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/kupal.git
git push -u origin main
```

## 3. Cloudflare Pages
1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git.
2. Pick the repo. Framework preset: **None**. Build command: *(leave empty)*. Output directory: `/`.
3. Save and deploy. Every push to `main` redeploys automatically.

## Test locally
`python3 -m http.server 8000` then open http://localhost:8000
