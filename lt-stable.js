const localtunnel = require('localtunnel');

async function startTunnel() {
  try {
    const tunnel = await localtunnel({ port: 3000, subdomain: 'blazeearn-admin' });
    console.log(`Tunnel running at: ${tunnel.url}`);

    tunnel.on('close', () => {
      console.log('Tunnel closed, restarting...');
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
    });
  } catch(err) {
    console.error('Failed to start tunnel:', err);
    setTimeout(startTunnel, 5000);
  }
}

startTunnel();
