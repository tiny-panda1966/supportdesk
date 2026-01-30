# Helpdesk UI - Modular GitHub Structure

This project splits the helpdesk UI into modular files for easier editing and version control.

## Structure

```
helpdesk-github/
├── src/
│   ├── css/
│   │   └── helpdesk.css      ← All styles (937 lines)
│   ├── html/
│   │   └── body.html         ← HTML body content (357 lines)
│   └── js/
│       └── helpdesk.js       ← Frontend JavaScript (1581 lines)
├── dist/
│   └── helpdesk-ui.html      ← Built output (DO NOT EDIT)
├── helpdesk.web.js           ← Backend code (copy to Wix Blocks)
├── build.js                  ← Build script
├── .github/
│   └── workflows/
│       └── build.yml         ← Auto-build on push
└── package.json
```

## Setup

### 1. Create GitHub Repo

```bash
# Create new private repo on GitHub
# Then clone it locally:
git clone https://github.com/YOUR-USERNAME/helpdesk-ui.git
cd helpdesk-ui

# Copy these files into the repo
```

### 2. Enable GitHub Pages

1. Go to repo **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / **/ (root)** or **/dist**
4. Save

Your URL will be: `https://YOUR-USERNAME.github.io/helpdesk-ui/dist/helpdesk-ui.html`

### 3. Update Wix Widget

In your Wix Blocks widget.js:

```javascript
$w.onReady(() => {
    const htmlComponent = $w('#htmlComponent');
    htmlComponent.src = 'https://YOUR-USERNAME.github.io/helpdesk-ui/dist/helpdesk-ui.html';
    
    // ... rest of widget code
});
```

## Daily Workflow

1. Edit files in `src/` folder
2. Run `node build.js` to test locally
3. Commit and push:
   ```bash
   git add .
   git commit -m "Updated feature X"
   git push
   ```
4. GitHub Actions auto-builds → Wix loads updated file

## Files

### src/css/helpdesk.css
All CSS styles. Edit colors, layouts, responsive breakpoints here.

### src/html/body.html
HTML structure. Edit to add new sections, modals, or UI elements.

### src/js/helpdesk.js
Frontend JavaScript. Edit to change behavior, add features, handle messages.

### helpdesk.web.js
Backend code. Copy this to your Wix Blocks app `backend/helpdesk.web.js` file.

## Tips

- Keep the `dist/` folder in git - GitHub Pages serves from it
- The GitHub Action auto-commits built files
- Test locally with `node build.js` before pushing
- Backend code (`helpdesk.web.js`) still goes manually into Wix Blocks
