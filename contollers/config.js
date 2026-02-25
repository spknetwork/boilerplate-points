const CommunityConfig = require("../models/CommunityConfig");

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

        let config = await CommunityConfig.findOne({ domain: cleanedDomain });

        if (config) {
            // Update existing
            config.communityName = communityName;
            config.hiveCommunityId = hiveCommunityId;
            config.logoUrl = logoUrl;
            config.primaryColor = primaryColor;
            config.onboardingSats = onboardingSats;
            config.communityDescription = communityDescription;
            config.communityDescriptionExtra = communityDescriptionExtra;
            await config.save();
        } else {
            // Create new
            config = await CommunityConfig.create({
                domain: cleanedDomain,
                communityName,
                hiveCommunityId,
                logoUrl,
                primaryColor,
                onboardingSats,
                communityDescription,
                communityDescriptionExtra,
                isConfigured: true
            });
        }

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
