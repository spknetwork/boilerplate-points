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
        let cfResult = response.data;

        // Polling loop: If SSL is 'initializing' and missing txt_name, wait up to 10 seconds for Cloudflare to generate it
        if (cfResult && cfResult.result && cfResult.result.ssl && !cfResult.result.ssl.txt_name) {
            let retries = 0;
            const maxRetries = 10;
            while (retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                retries++;
                const checkStatus = await getCustomHostname(hostname);
                if (checkStatus && checkStatus.result && checkStatus.result.ssl && checkStatus.result.ssl.txt_name) {
                    cfResult = checkStatus;
                    break;
                }
            }
        }

        return cfResult;
    } catch (error) {
        // If it already exists, just try to get it
        if (error.response && error.response.status === 409) {

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
            let cfResult = { success: true, result: response.data.result[0] };

            // Polling loop: If fetching an existing hostname that is still generating its SSL TXT
            if (cfResult && cfResult.result && cfResult.result.ssl && !cfResult.result.ssl.txt_name) {
                let retries = 0;
                const maxRetries = 10;
                while (retries < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    retries++;
                    const checkStatus = await axios.get(
                        `${CLOUDFLARE_API_BASE}/zones/${zoneId}/custom_hostnames?hostname=${hostname}`,
                        {
                            headers: {
                                'Authorization': `Bearer ${apiToken}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    if (checkStatus.data.result && checkStatus.data.result.length > 0 && checkStatus.data.result[0].ssl && checkStatus.data.result[0].ssl.txt_name) {
                        cfResult = { success: true, result: checkStatus.data.result[0] };
                        break;
                    }
                }
            }

            return cfResult;
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
