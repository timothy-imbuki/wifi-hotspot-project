const { RouterOSClient } = require('routeros-client');

/**
 * Grant Wi-Fi access to a user via MikroTik hotspot
 * @param {string} phone - User's phone number (used as username)
 * @param {object} plan - Plan object containing durationMinutes and profile
 */
async function grantWifiAccess(phone, plan) {
  // Load router credentials from environment variables
  const routerHost = process.env.ROUTER_HOST || '192.168.88.1';
  const routerUser = process.env.ROUTER_USER || 'admin';
  const routerPassword = process.env.ROUTER_PASSWORD;

  if (!routerPassword) {
    throw new Error('ROUTER_PASSWORD environment variable not set');
  }

  const client = new RouterOSClient({
    host: routerHost,
    user: routerUser,
    password: routerPassword
  });

  try {
    await client.connect();

    // Generate a simple random password for the hotspot user
    const hotspotPassword = Math.random().toString(36).slice(-6);

    // Add hotspot user – adjust the command to match your RouterOS version
    // This example uses the API method from routeros-client; actual syntax may vary.
    await client.write('/ip/hotspot/user/add', [
      `=name=${phone}`,
      `=password=${hotspotPassword}`,
      `=profile=${plan.profile}`,
      `=limit-uptime=${plan.durationMinutes}m` // duration in minutes
    ]);

    console.log(`✅ Wi‑Fi access granted to ${phone} for ${plan.durationMinutes} minutes`);
  } catch (error) {
    console.error('❌ Router error:', error.message);
    throw error; // Re-throw so the caller can handle it
  } finally {
    client.close();
  }
}

module.exports = { grantWifiAccess };