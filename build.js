/**
 * Helpdesk UI Build Script
 * Combines modular CSS, HTML, and JS into a single helpdesk-ui.html file
 * 
 * Usage: node build.js
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const DIST_DIR = path.join(__dirname, 'dist');
const OUTPUT_FILE = path.join(DIST_DIR, 'helpdesk-ui.html');

// Ensure dist directory exists
if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Read source files
const css = fs.readFileSync(path.join(SRC_DIR, 'css', 'helpdesk.css'), 'utf8');
const body = fs.readFileSync(path.join(SRC_DIR, 'html', 'body.html'), 'utf8');
const js = fs.readFileSync(path.join(SRC_DIR, 'js', 'helpdesk.js'), 'utf8');

// Build the complete HTML
const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Support Desk</title>
    <link href="https://fonts.googleapis.com/css2?family=Wix+Madefor+Text:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
${css}
    </style>
</head>
<body>
${body}
    <!-- JavaScript -->
    <script>
${js}
    </script>
</body>
</html>`;

// Write output file
fs.writeFileSync(OUTPUT_FILE, html, 'utf8');

console.log(`✅ Build complete: ${OUTPUT_FILE}`);
console.log(`   CSS:  ${css.length.toLocaleString()} chars`);
console.log(`   HTML: ${body.length.toLocaleString()} chars`);
console.log(`   JS:   ${js.length.toLocaleString()} chars`);
console.log(`   Total: ${html.length.toLocaleString()} chars`);

