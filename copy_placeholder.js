const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'frontend/public/images/diriyah.jpg');
const dest = path.join(__dirname, 'frontend/public/images/default_placeholder.jpg');

try {
  fs.copyFileSync(src, dest);
  console.log('Copied default_placeholder.jpg successfully!');
} catch (e) {
  console.error('Error copying file:', e);
}
