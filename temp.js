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

            // Check if the expected structure exists
            if (!result.ActualWeather || !result.ActualWeather.Custom || !result.ActualWeather.Custom[0].WeatherReport) {
                console.error('Invalid XML structure: Missing ActualWeather, Custom, or WeatherReport');
                return res.status(500).json({ error: 'Invalid XML structure', details: 'Expected elements not found' });
            }

            const weatherReports = result.ActualWeather.Custom[0].WeatherReport;

            // Log all stations with their codes to debug
            console.log('Available stations:');
            weatherReports.forEach(report => {
                if (report.station && report.station.$ && report.station.$.code && report.station.stationname && report.station.stationname[0]) {
                    console.log(`- Code: ${report.station.$.code}, Name: ${report.station.stationname[0]}`);
                } else {
                    console.log('- Station data missing or malformed');
                }
            });

            // Find the station for Taipa Grande by code "TG"
            const taipaStation = weatherReports.find(report => 
                report.station && report.station.$ && report.station.$.code === 'TG'
            );

            if (!taipaStation) {
                console.error('Taipa Grande station (code TG) not found in the XML');
                return res.status(404).json({ error: 'Taipa Grande (code TG) not found' });
            }

            const station = taipaStation.station;

            // Extract weather data with validation
            if (!station.Temperature_daily_max || !station.Temperature_daily_max[0] || !station.Temperature_daily_max[0].Value) {
                return res.status(500).json({ error: 'Invalid XML structure', details: 'Temperature_daily_max value missing' });
            }
            if (!station.Temperature_daily_min || !station.Temperature_daily_min[0] || !station.Temperature_daily_min[0].Value) {
                return res.status(500).json({ error: 'Invalid XML structure', details: 'Temperature_daily_min value missing' });
            }
            if (!station.Humidity || !station.Humidity[0] || !station.Humidity[0].Value) {
                return res.status(500).json({ error: 'Invalid XML structure', details: 'Humidity value missing' });
            }

            const weather = {
                minTemp: station.Temperature_daily_min[0].Value[0],
                maxTemp: station.Temperature_daily_max[0].Value[0],
                humidity: station.Humidity[0].Value[0]
            };

            res.json(weather);
        });
    } catch (error) {
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