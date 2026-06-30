const https = require('https');
const fs = require('fs');

function download(url, dest) {
    https.get(url, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            console.log('Redirecting to: ' + response.headers.location);
            download(response.headers.location, dest);
        } else {
            const file = fs.createWriteStream(dest);
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log('Download complete.');
            });
        }
    }).on('error', (err) => {
        console.error('Error: ' + err.message);
    });
}

download('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe', 'cloudflared.exe');
