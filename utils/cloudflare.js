const axios = require('axios');

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

/**
 * Registers a custom hostname for Cloudflare for SaaS
 * @param {string} hostname The custom domain (e.g., whive.online)
 * @returns {Promise<object>} The Cloudflare response
 */
const registerCustomHostname = async (hostname) => {
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!zoneId || !apiToken) {
        console.warn('⚠️ Cloudflare credentials missing. Skipping automated hostname registration.');
        return null;
    }

    try {
        console.log(`📡 [Cloudflare] Registering hostname: ${hostname}`);

        const response = await axios.post(
            `${CLOUDFLARE_API_BASE}/zones/${zoneId}/custom_hostnames`,
            {
                hostname: hostname,
                ssl: {
                    method: 'txt',
                    type: 'dv'
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error) {
        // If it already exists, just try to get it
        if (error.response && error.response.status === 409) {
            console.log(`ℹ️ [Cloudflare] Hostname ${hostname} already exists. Fetching details...`);
            return await getCustomHostname(hostname);
        }

        console.error('❌ [Cloudflare] Error registering hostname:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Fetches details for a custom hostname
 */
const getCustomHostname = async (hostname) => {
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    try {
        const response = await axios.get(
            `${CLOUDFLARE_API_BASE}/zones/${zoneId}/custom_hostnames?hostname=${hostname}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.result && response.data.result.length > 0) {
            return { success: true, result: response.data.result[0] };
        }
        return null;
    } catch (error) {
        console.error('❌ [Cloudflare] Error fetching hostname:', error.response?.data || error.message);
        return null;
    }
};

module.exports = {
    registerCustomHostname,
    getCustomHostname
};
