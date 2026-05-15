#!/usr/bin/env node
/**
 * Training 4M — Icon Generator (Node.js)
 * Requires: npm install canvas
 * Usage:    node generate-icons.js
 * Output:   ./icons/ folder with all PNG files
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'icons');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const FD = {
  midnight: '#09092d',
  indigo:   '#4b4bf9',
  white:    '#ffffff',
  mint:     '#8bf0bb',
  lemon:    '#f9ef77',
  coral:    '#ff8d96',
  lavender: '#bfa1ff',
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return { r, g, b };
}

function drawRoundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill !== undefined) {
    ctx.fillStyle = fill;
    ctx.fill();
  } else {
    ctx.fill();
  }
}

function drawIcon(ctx, size, maskable = false) {
  const S = size;
  ctx.clearRect(0, 0, S, S);

  // Background
  if (!maskable) {
    const r = S * 0.22;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(S-r, 0);
    ctx.quadraticCurveTo(S, 0, S, r);
    ctx.lineTo(S, S-r);
    ctx.quadraticCurveTo(S, S, S-r, S);
    ctx.lineTo(r, S);
    ctx.quadraticCurveTo(0, S, 0, S-r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();

    const bgGrad = ctx.createLinearGradient(0, 0, S, S);
    bgGrad.addColorStop(0, '#09092d');
    bgGrad.addColorStop(1, '#1a1a6e');
    ctx.fillStyle = bgGrad;
    ctx.fill();
  } else {
    const bgGrad = ctx.createLinearGradient(0, 0, S, S);
    bgGrad.addColorStop(0, '#09092d');
    bgGrad.addColorStop(1, '#1a1a6e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, S, S);
  }

  // Glow
  const glowGrad = ctx.createRadialGradient(S*.5, S*.47, 0, S*.5, S*.47, S*.28);
  glowGrad.addColorStop(0, 'rgba(75,75,249,0.15)');
  glowGrad.addColorStop(1, 'rgba(75,75,249,0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(S*.5, S*.47, S*.28, 0, Math.PI*2);
  ctx.fill();

  // Plates
  const plateW = S*.10, plateH = S*.20, plateY = S*.39;
  const accGrad = ctx.createLinearGradient(0, plateY, 0, plateY+plateH);
  accGrad.addColorStop(0, '#4b4bf9');
  accGrad.addColorStop(1, '#bfa1ff');

  // Left plate
  const lPX = S*.125;
  ctx.fillStyle = accGrad;
  drawRoundRect(ctx, lPX, plateY, plateW, plateH, S*.027);
  ctx.fillStyle = 'rgba(9,9,45,0.35)';
  drawRoundRect(ctx, lPX+S*.016, plateY+S*.023, plateW-S*.031, plateH-S*.047, S*.019);
  ctx.beginPath(); ctx.arc(lPX+plateW*.5, plateY+plateH*.5, S*.019, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(9,9,45,0.6)'; ctx.fill();

  // Left collar
  ctx.fillStyle = '#6b6bff';
  drawRoundRect(ctx, S*.225, plateY+S*.039, S*.047, plateH-S*.078, S*.015);

  // Bar
  const barGrad = ctx.createLinearGradient(S*.30, 0, S*.70, 0);
  barGrad.addColorStop(0, '#4b4bf9'); barGrad.addColorStop(1, '#8bf0bb');
  ctx.fillStyle = barGrad;
  drawRoundRect(ctx, S*.30, S*.435, S*.40, S*.047, S*.023);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  drawRoundRect(ctx, S*.30, S*.435, S*.40, S*.018, S*.009);

  // Right collar
  ctx.fillStyle = '#6b6bff';
  drawRoundRect(ctx, S*.728, plateY+S*.039, S*.047, plateH-S*.078, S*.015);

  // Right plate
  const rPX = S*.773;
  ctx.fillStyle = accGrad;
  drawRoundRect(ctx, rPX, plateY, plateW, plateH, S*.027);
  ctx.fillStyle = 'rgba(9,9,45,0.35)';
  drawRoundRect(ctx, rPX+S*.016, plateY+S*.023, plateW-S*.031, plateH-S*.047, S*.019);
  ctx.beginPath(); ctx.arc(rPX+plateW*.5, plateY+plateH*.5, S*.019, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(9,9,45,0.6)'; ctx.fill();

  // Arc
  const arcCX=S*.5, arcCY=S*.48, arcR=S*.31, arcStart=Math.PI*.15;
  ctx.beginPath();
  ctx.arc(arcCX, arcCY, arcR, Math.PI+arcStart, Math.PI*2-arcStart+Math.PI);
  ctx.strokeStyle = 'rgba(75,75,249,0.18)';
  ctx.lineWidth = S*.019; ctx.lineCap = 'round'; ctx.stroke();

  const pGrad = ctx.createLinearGradient(arcCX-arcR, 0, arcCX+arcR, 0);
  pGrad.addColorStop(0, '#4b4bf9'); pGrad.addColorStop(1, '#8bf0bb');
  ctx.beginPath();
  ctx.arc(arcCX, arcCY, arcR, Math.PI+arcStart, Math.PI+arcStart+(Math.PI-arcStart*2)*.75);
  ctx.strokeStyle = pGrad; ctx.lineWidth = S*.019; ctx.lineCap = 'round'; ctx.stroke();

  // Dot
  const dA = Math.PI+arcStart+(Math.PI-arcStart*2)*.75;
  const dX = arcCX+arcR*Math.cos(dA), dY = arcCY+arcR*Math.sin(dA);
  ctx.beginPath(); ctx.arc(dX, dY, S*.014, 0, Math.PI*2);
  ctx.fillStyle = '#8bf0bb'; ctx.fill();

  // Text
  const tGrad = ctx.createLinearGradient(S*.35, 0, S*.65, 0);
  tGrad.addColorStop(0, '#4b4bf9'); tGrad.addColorStop(1, '#bfa1ff');
  ctx.font = `900 ${S*.135}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = tGrad; ctx.fillText('4M', S*.5, S*.83);

  // Sparkles
  [[S*.31,S*.29,'#f9ef77',0.65],[S*.69,S*.29,'#f9ef77',0.65],
   [S*.25,S*.63,'#8bf0bb',0.5],[S*.75,S*.63,'#8bf0bb',0.5]].forEach(([x,y,c,o])=>{
    ctx.globalAlpha=o;
    ctx.beginPath(); ctx.arc(x, y, S*.008, 0, Math.PI*2);
    ctx.fillStyle=c; ctx.fill(); ctx.globalAlpha=1;
  });
}

function saveIcon(filename, size, maskable = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  drawIcon(ctx, size, maskable);
  const buffer = canvas.toBuffer('image/png');
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ Generated: ${filename} (${size}×${size})`);
}

async function main() {
  console.log('\n🎨 Training 4M — Icon Generator\n');

  saveIcon('icon-192.png',         192, false);
  saveIcon('icon-512.png',         512, false);
  saveIcon('icon-192-maskable.png',192, true);
  saveIcon('icon-512-maskable.png',512, true);
  saveIcon('apple-touch-icon.png', 180, false);
  saveIcon('favicon-32.png',        32, false);

  console.log('\n📁 All icons saved to ./icons/');
  console.log('📋 Copy icon-192.png and icon-512.png to /Programme/\n');
}

main().catch(console.error);