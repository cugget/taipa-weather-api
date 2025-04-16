const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const app = express();
const port = process.env.PORT || 3000;

// Add a root route (optional, to avoid "Cannot GET /" error)
app.get('/', (req, res) => {
    res.send('Welcome to the Taipa Weather API! Use /taipa-weather to get weather data.');
});

app.get('/taipa-weather', async (req, res) => {
    try {
        // Add User-Agent header to the request
        const response = await axios.get('https://xml.smg.gov.mo/e_actualweather.xml', {
            headers: {
                'User-Agent': 'TaipaWeatherAPI/1.0 (your-email@example.com)'
            },
            timeout: 10000 // Set a 10-second timeout
        });

        xml2js.parseString(response.data, (err, result) => {
            if (err) {
                console.error('XML Parsing Error:', err);
                return res.status(500).json({ error: 'Error parsing XML', details: err.message });
            }

            const stations = result.WeatherReport.station;
            const taipa = stations.find(
                station => station.stationname[0] === 'TAIPA GRANDE'
            );

            if (!taipa) return res.status(404).json({ error: 'Taipa Grande not found' });

            const weather = {
                minTemp: taipa.Temperature_daily_min[0].Value[0],
                maxTemp: taipa.Temperature_daily_max[0].Value[0],
                humidity: taipa.Humidity[0].Value[0]
            };

            res.json(weather);
        });
    } catch (error) {
        // Log detailed error information
        console.error('Fetch Error:', {
            message: error.message,
            code: error.code,
            responseStatus: error.response ? error.response.status : 'N/A',
            responseData: error.response ? error.response.data : 'N/A'
        });

        res.status(500).json({
            error: 'Error fetching data',
            details: error.message,
            status: error.response ? error.response.status : 'N/A'
        });
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));