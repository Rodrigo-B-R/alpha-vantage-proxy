const express = require('express');
const axios = require('axios');
const { URL } = require('url'); // Import the URL class
require('dotenv').config(); // To load environment variables from a .env file

const app = express();

// Note: Ensure your .env file has ALPHA_VANTAGE_API_KEY=YOURKEY without quotes
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const ALPHA_VANTAGE_HOSTNAME = 'www.alphavantage.co';

// Check if the API key is set in the environment
if (!ALPHA_VANTAGE_API_KEY) {
    console.error('Error: ALPHA_VANTAGE_API_KEY is not set. Please create a .env file with its value.');
    process.exit(1); // Exit the process with an error code
}

/**
 * This route acts as a proxy to the Alpha Vantage API.
 * It takes a full Alpha Vantage URL (without the apikey) as a query parameter.
 * Example: /api/alpha-vantage?url=https://www.alphavantage.co/query?function=OVERVIEW&symbol=IBM
 */
app.get('/api/alpha-vantage', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({ error: 'Missing required query parameter: "url".' });
    }

    try {
        const urlObject = new URL(targetUrl);

        // Security check: ensure we are only proxying to the allowed Alpha Vantage domain
        if (urlObject.hostname !== ALPHA_VANTAGE_HOSTNAME) {
            return res.status(400).json({ error: `Invalid proxy request. Hostname not allowed. Only requests to ${ALPHA_VANTAGE_HOSTNAME} are permitted.` });
        }

        // Securely add the API key to the request parameters
        urlObject.searchParams.set('apikey', ALPHA_VANTAGE_API_KEY);

        // Make the GET request to the final Alpha Vantage URL
        const response = await axios.get(urlObject.toString());

        // Alpha Vantage can return errors in the JSON response with a 200 status
        if (response.data['Error Message']) {
            return res.status(400).json({ error: response.data['Error Message'] });
        }
        // Send the data from Alpha Vantage back to the original client
        res.json(response.data);
    } catch (error) {
        // Handle malformed URLs from the client
        if (error instanceof TypeError && error.code === 'ERR_INVALID_URL') {
            return res.status(400).json({ error: 'Invalid URL format provided.' });
        }

        console.error('Error proxying to Alpha Vantage:', error.message);
        // Handle network errors or errors from the Alpha Vantage API server
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: 'An internal server error occurred.' };
        return res.status(status).json(data);
    }
});

app.get('/', (req, res) => {
    res.send('Hola desde el proxy!');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Proxy server listening on port ${PORT}`);
});
