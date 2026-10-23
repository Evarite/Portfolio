# Alaksiej — Unity Gameplay Developer Portfolio

A responsive static portfolio website designed for GitHub Pages, showcasing Unity C# games, clean architecture patterns, ScriptableObject spawning systems, and GameJam projects.

## 🚀 How to Deploy to GitHub Pages

1. Create a repository on GitHub (e.g., `username.github.io` or `portfolio`).
2. Link your local repository and push:
   ```bash
   git init
   git add .
   git commit -m "Initial portfolio release"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
3. Go to **Settings** > **Pages** in your GitHub repository and select the `main` branch root (`/`). Your site will be live!

## 🎮 How to Add Gameplay GIFs

Place your recorded gameplay GIFs in the `assets/gifs/` directory using the following names:
- `sunflower_gameplay.gif` (Saulespuke Helianthus)
- `2dv5_runner.gif` (Infinite Jetpack Runner)
- `2dv4_airship.gif` (Steampunk Airship Combat)
- `relentless_combat.gif` (Relentless Shooter Combat)
- `2dv3_cards.gif` (Card Memory Matching)

The website is already programmed to detect and highlight these preview slots.

## 🛠️ Tech Stack
- Pure Semantic HTML5 & SEO Meta Tags
- Bespoke Vanilla CSS (Dark theme, glassmorphism, responsive grid, no heavy frameworks)
- Interactive JavaScript (Particle canvas, C# syntax highlighter, roguelite simulator widget, media switcher)

