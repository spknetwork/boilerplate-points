const CommunityConfig = require("../models/CommunityConfig");
const { registerCustomHostname } = require("../utils/cloudflare");

const getConfig = async (req, res) => {
    try {
        const { domain } = req.params;
        // Normalize domain (lowercase, remove protocol if present, remove port)
        let cleanedDomain = domain.toLowerCase().replace(/^(https?:\/\/)/, "").split(":")[0];

        // Fallback for development
        if (cleanedDomain === "localhost") {
            cleanedDomain = "localhost";
        }

        const config = await CommunityConfig.findOne({ domain: cleanedDomain });

        if (!config) {
            return res.status(404).json({
                success: false,
                message: "Community not configured for this domain",
                isConfigured: false
            });
        }

        return res.status(200).json({
            success: true,
            config
        });
    } catch (error) {
        console.error("Error fetching config:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const saveConfig = async (req, res) => {
    try {
        const {
            domain,
            communityName,
            hiveCommunityId,
            logoUrl,
            primaryColor,
            onboardingSats,
            communityDescription,
            communityDescriptionExtra
        } = req.body;

        if (!domain || !communityName || !hiveCommunityId) {
            return res.status(400).json({
                success: false,
                message: "Domain, Community Name, and Hive Community ID are required"
            });
        }

        let cleanedDomain = domain.toLowerCase().replace(/^(https?:\/\/)/, "").split(":")[0];

        // 1. Save to DB
        let config = await CommunityConfig.findOne({ domain: cleanedDomain });

        const updateData = {
            communityName,
            hiveCommunityId,
            logoUrl,
            primaryColor,
            onboardingSats,
            communityDescription,
            communityDescriptionExtra,
            isConfigured: true
        };

        if (config) {
            Object.assign(config, updateData);
        } else {
            config = new CommunityConfig({ domain: cleanedDomain, ...updateData });
        }

        // 2. Attempt Cloudflare Registration (Automated SSL)
        try {
            const cfResult = await registerCustomHostname(cleanedDomain);
            if (cfResult && cfResult.result) {
                config.sslVerificationData = {
                    hostname_id: cfResult.result.id,
                    ssl: cfResult.result.ssl,
                    ownership_verification: cfResult.result.ownership_verification
                };
                config.hostnameStatus = cfResult.result.status;
            }
        } catch (cfError) {
            console.warn("⚠️ Cloudflare automation failed, but config saved locally.");
        }

        await config.save();

        return res.status(200).json({
            success: true,
            message: "Configuration saved successfully",
            config
        });
    } catch (error) {
        console.error("Error saving config:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = {
    getConfig,
    saveConfig
};
