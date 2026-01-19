# Anteckningar (Notes PWA) v0.1 Step A

## What this is
A minimal, static notes web app shell built with plain HTML, CSS, and JavaScript.
This step is UI only, no real note storage yet.

## Features in Step A
1. Mobile-first layout with notes list and editor panel
2. Clickable buttons with clear feedback (toast)
3. Light and dark theme toggle
4. Theme preference saved in localStorage
5. Respects prefers-color-scheme when no manual choice exists

## How to run locally
Option 1: Open `index.html` directly in your browser.

Option 2: Use a simple local server (recommended).
Example with Python:
1. Open a terminal in the project folder
2. Run: `python -m http.server 5500`
3. Visit: `http://localhost:5500`

## Deploy to Vercel
This is a static site with no build step.

1. Create a new Vercel project
2. Import your Git repo (or drag and drop the folder in Vercel if you prefer)
3. Framework preset: Other
4. Build command: leave empty
5. Output directory: leave empty (root)
6. Deploy

## Known limitations (Step A)
- Notes cannot be created, edited, searched, deleted, or backed up yet
- Buttons only show placeholder messages

## Next step
Step B will implement localStorage data model and real CRUD actions:
Create, list, edit, delete, and basic autosave behavior.
