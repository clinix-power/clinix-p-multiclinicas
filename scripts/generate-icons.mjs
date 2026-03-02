/**
 * Generate PNG icons from SVG for PWA manifest and favicon.
 * Run: node scripts/generate-icons.mjs
 */
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

// SVG source — matches ClinixIcon.tsx exactly
const svgSource = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1a1033"/><stop offset="50%" stop-color="#0f0b1a"/><stop offset="100%" stop-color="#130d20"/></linearGradient>
<linearGradient id="b" x1="0.3" y1="0" x2="0.7" y2="1"><stop offset="0%" stop-color="#d8b4fe"/><stop offset="30%" stop-color="#c084fc"/><stop offset="60%" stop-color="#a855f7"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient>
<linearGradient id="gl" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#e9d5ff" stop-opacity="0.6"/><stop offset="100%" stop-color="#a855f7" stop-opacity="0"/></linearGradient>
<filter id="g" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/><feColorMatrix in="blur" type="matrix" values="0.6 0 0.2 0 0.1 0 0.2 0 0 0 0.2 0 0.8 0 0.3 0 0 0 0.7 0" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect x="2" y="2" width="116" height="116" rx="26" ry="26" fill="url(#bg)"/>
<rect x="2" y="2" width="116" height="116" rx="26" ry="26" fill="none" stroke="#2d2348" stroke-width="1"/>
<g filter="url(#g)" transform="translate(25,16) scale(2.9)">
<path d="M13 2L3 14h8l-1 8 11-14h-8l0-6z" fill="url(#b)" stroke-linejoin="round"/>
<path d="M13 2L3 14h8l-1 8 11-14h-8l0-6z" fill="url(#gl)" stroke-linejoin="round"/>
<path d="M13 2L3 14h8l-1 8 11-14h-8l0-6z" fill="none" stroke="#d8b4fe" stroke-width="0.4" stroke-linejoin="round" stroke-opacity="0.5"/>
</g>
</svg>`

// Write SVG as icon.svg
writeFileSync(join(publicDir, 'icon.svg'), svgSource)
console.log('✅ icon.svg written')

// For the actual PNG generation, we write an HTML file that uses canvas
// This can be opened in a browser to download the PNGs
const htmlGenerator = `<!DOCTYPE html>
<html>
<head><title>Icon Generator</title></head>
<body style="background:#222;color:#fff;font-family:sans-serif;padding:40px;">
<h2>Clinix Power Icon Generator</h2>
<p>Right-click each image and "Save image as..." to download.</p>
<div id="out" style="display:flex;gap:20px;flex-wrap:wrap;"></div>
<script>
const svg = \`${svgSource.replace(/`/g, '\\`')}\`;
const sizes = [192, 512];
const container = document.getElementById('out');

sizes.forEach(s => {
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d');

  const img = new Image();
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  img.onload = () => {
    ctx.drawImage(img, 0, 0, s, s);
    URL.revokeObjectURL(url);
    
    const div = document.createElement('div');
    div.style.textAlign = 'center';
    
    const title = document.createElement('p');
    title.textContent = 'icon-' + s + '.png (' + s + 'x' + s + ')';
    div.appendChild(title);
    
    const imgEl = document.createElement('img');
    imgEl.src = canvas.toDataURL('image/png');
    imgEl.style.width = Math.min(s, 256) + 'px';
    imgEl.style.borderRadius = '20px';
    div.appendChild(imgEl);
    
    // Auto-download link
    const link = document.createElement('a');
    link.download = 'icon-' + s + '.png';
    link.href = canvas.toDataURL('image/png');
    link.textContent = 'Download';
    link.style.display = 'block';
    link.style.marginTop = '8px';
    link.style.color = '#a855f7';
    div.appendChild(link);
    
    container.appendChild(div);
  };
  img.src = url;
});
<\/script>
</body>
</html>`;

writeFileSync(join(publicDir, '_icon-gen.html'), htmlGenerator)
console.log('✅ _icon-gen.html written (open in browser to get PNGs)')
console.log('')
console.log('NOTE: For immediate use, icon.svg is already functional as favicon and PWA icon.')
console.log('To generate pixel-perfect PNGs, open http://localhost:3000/_icon-gen.html in your browser.')
