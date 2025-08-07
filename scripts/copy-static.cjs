#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy markdown directory
const markdownSrc = path.join(__dirname, '..', 'src', 'markdown');
const markdownDest = path.join(__dirname, '..', 'dist', 'markdown');

if (fs.existsSync(markdownSrc)) {
  copyDir(markdownSrc, markdownDest);
  console.log('✓ Copied markdown files');
}

// Copy dashboard public directory
const publicSrc = path.join(__dirname, '..', 'src', 'dashboard', 'public');
const publicDest = path.join(__dirname, '..', 'dist', 'dashboard', 'public');

if (fs.existsSync(publicSrc)) {
  copyDir(publicSrc, publicDest);
  console.log('✓ Copied dashboard public files');
}