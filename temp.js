const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Welcome to the Taipa Weather API! Use /taipa-weather to get current + forecast weather data.');
});

app.get('/taipa-weather', async (req, res) => {
    try {
        // Step 1: Fetch current data
        const currentRes = await axios.get('https://xml.smg.gov.mo/e_actualweather.xml', {
            headers: { 'User-Agent': 'TaipaWeatherAPI/1.0 (your-email@example.com)' },
            timeout: 10000
        });

        // Step 2: Fetch forecast data (text, not real XML)
        const forecastRes = await axios.get('https://xml.smg.gov.mo/e_7daysforecast.xml', {
            headers: { 'User-Agent': 'TaipaWeatherAPI/1.0 (your-email@example.com)' },
            timeout: 10000
        });

        // Parse actual weather XML
        let station = null;
        let stationName = '';
        let stationCode = '';
        let currentTemp = 'N/A';
        let humidity = 'N/A';

        await xml2js.parseStringPromise(currentRes.data).then((result) => {
            const weatherReports = result?.ActualWeather?.Custom?.[0]?.WeatherReport || [];

            let selectedStation = weatherReports.find(report =>
                report.station &&
                report.station[0] &&
                report.station[0].$ &&
                report.station[0].$.code === 'TG'
            );

            if (!selectedStation) {
                selectedStation = weatherReports.find(report =>
                    report.station &&
                    report.station[0] &&
                    report.station[0].$ &&
                    report.station[0].$.code === 'FM'
                );
            }

            if (selectedStation) {
                station = selectedStation.station[0];
                stationName = station.stationname?.[0] ?? 'Unknown Station';
                stationCode = station.$.code ?? 'Unknown';
                currentTemp = station.Temperature?.[0]?.Value?.[0] ?? 'N/A';
                humidity = station.Humidity?.[0]?.Value?.[0] ?? 'N/A';
            }
        });

        // Parse forecast text (only first valid line after headers)
        const lines = forecastRes.data.split('\n').filter(line => /^\d{4}-\d{2}-\d{2}/.test(line));
        const todayLine = lines.length > 0 ? lines[0] : null;

        let forecastMax = 'N/A';
        let forecastMin = 'N/A';

        if (todayLine) {
            const parts = todayLine.split('\t');
            if (parts.length >= 5) {
                forecastMax = parts[3].replace('°C', '');
                forecastMin = parts[4].replace('°C', '');
            }
        }

        // Build response
        res.json({
            station: stationName,
            stationCode: stationCode,
            currentTemp,
            humidity,
            forecastMin,
            forecastMax
        });

    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to fetch or parse weather data', details: error.message });
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));
