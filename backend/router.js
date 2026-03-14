const { RouterOSClient } = require('routeros-client');

/**
 * Grant Wi-Fi access to a user via MikroTik hotspot
 * @param {string} phone - User's phone number (used as username)
 * @param {object} plan - Plan object containing durationMinutes and profile
 * @param {string} [mac] - Client MAC address (optional, stored as comment)
 */
async function grantWifiAccess(phone, plan, mac = '') {
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
    const hotspotPassword = Math.random().toString(36).slice(-8);

    // Convert minutes to seconds for limit-uptime
    const uptimeSeconds = plan.durationMinutes * 60;

    // Prepare command arguments
    const args = [
      `=name=${phone}`,
      `=password=${hotspotPassword}`,
      `=profile=${plan.profile}`,
      `=limit-uptime=${uptimeSeconds}`
    ];

    if (mac) {
      args.push(`=comment=${mac}`);
    }

    // Add hotspot user
    await client.write('/ip/hotspot/user/add', args);

    console.log(`✅ Wi‑Fi access granted to ${phone} for ${plan.durationMinutes} minutes (MAC: ${mac || 'N/A'})`);
  } catch (error) {
    console.error('❌ Router error:', error.message);
    throw error;
  } finally {
    client.close();
  }
}

module.exports = { grantWifiAccess };