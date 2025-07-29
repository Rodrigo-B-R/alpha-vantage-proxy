const express = require('express');
const axios = require('axios');
const { URL } = require('url'); // Import the URL class
require('dotenv').config(); // To load environment variables from a .env file

const app = express();


const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const ALPHA_VANTAGE_HOSTNAME = 'www.alphavantage.co';


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

        urlObject.searchParams.set('apikey', ALPHA_VANTAGE_API_KEY);

    
        const response = await axios.get(urlObject.toString());

        if (response.data['Error Message']) {
            return res.status(400).json({ error: response.data['Error Message'] });
        }
        
        res.json(response.data);
    } catch (error) {
       
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
