const fs = require('fs');
const path = require('path');
const https = require('https');

const dir = path.join(__dirname, '../src/assets/fonts');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function main() {
  console.log('Đang tải font Roboto...');
  await download('https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/static/Roboto-Regular.ttf', path.join(dir, 'Roboto-Regular.ttf'));
  await download('https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/static/Roboto-Bold.ttf', path.join(dir, 'Roboto-Bold.ttf'));
  console.log('Tải font Roboto thành công!');
}

main().catch(console.error);
