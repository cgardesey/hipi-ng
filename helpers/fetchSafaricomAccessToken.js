const axios = require('axios');
const config = require('../config/config.json');

async function fetchSafaricomAccessToken() {
    try {
        const consumerKey = config.mpesa?.consumer_key;
        const consumerSecret = config.mpesa?.consumer_secret;

        if (!consumerKey || !consumerSecret) {
            throw new Error('M-Pesa configuration not found');
        }

        const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

        const response = await axios.get(
            config.mpesa.auth_url,
            {
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Accept': 'application/json',
                }
            }
        );

        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching access token:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = {
    fetchSafaricomAccessToken
};