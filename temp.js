const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Welcome to the Taipa Weather API! Use /taipa-weather to get weather data.');
});

app.get('/taipa-weather', async (req, res) => {
    try {
        const response = await axios.get('https://xml.smg.gov.mo/e_actualweather.xml', {
            headers: {
                'User-Agent': 'TaipaWeatherAPI/1.0 (your-email@example.com)'
            },
            timeout: 10000
        });

        xml2js.parseString(response.data, (err, result) => {
            if (err) {
                console.error('XML Parsing Error:', err);
                return res.status(500).json({ error: 'Error parsing XML', details: err.message });
            }

            const weatherReports = result?.ActualWeather?.Custom?.[0]?.WeatherReport || [];

            // Try to find TG (Taipa Grande)
            let selectedStation = weatherReports.find(report =>
                report.station &&
                report.station[0] &&
                report.station[0].$ &&
                report.station[0].$.code === 'TG'
            );

            // Fallback to FM (Fortaleza do Monte)
            if (!selectedStation) {
                console.warn('TG not found. Trying fallback FM...');
                selectedStation = weatherReports.find(report =>
                    report.station &&
                    report.station[0] &&
                    report.station[0].$ &&
                    report.station[0].$.code === 'FM'
                );
            }

            // Fallback to any station
            if (!selectedStation) {
                console.warn('TG and FM not found. Using first available station...');
                selectedStation = weatherReports.find(report =>
                    report.station &&
                    report.station[0] &&
                    report.station[0].$ &&
                    report.station[0].stationname?.[0]
                );
            }

            if (!selectedStation) {
                console.error('No valid stations found.');
                return res.status(404).json({ error: 'No valid stations found in the XML' });
            }

            const station = selectedStation.station[0];
            const stationName = station.stationname?.[0] ?? 'Unknown Station';
            const stationCode = station.$.code ?? 'Unknown';

            const maxTemp = station.Temperature_daily_max?.[0]?.Value?.[0] ?? 'N/A';
            const minTemp = station.Temperature_daily_min?.[0]?.Value?.[0] ?? 'N/A';
            const humidity = station.Humidity?.[0]?.Value?.[0] ?? 'N/A';

            res.json({
                station: stationName,
                stationCode: stationCode,
                minTemp: minTemp,
                maxTemp: maxTemp,
                humidity: humidity
            });
        });
    } catch (error) {
        console.error('Fetch Error:', {
            message: error.message,
            code: error.code,
            responseStatus: error.response?.status ?? 'N/A',
            responseData: error.response?.data ?? 'N/A'
        });

        res.status(500).json({
            error: 'Error fetching data',
            details: error.message,
            status: error.response?.status ?? 'N/A'
        });
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));
