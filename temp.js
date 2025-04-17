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
        // Step 2: Fetch proper forecast XML
		const forecastRes = await axios.get('https://xml.smg.gov.mo/e_forecast.xml', {
			headers: { 'User-Agent': 'TaipaWeatherAPI/1.0 (your-email@example.com)' },
			timeout: 10000
		});

		let forecastMax = 'N/A';
		let forecastMin = 'N/A';

		await xml2js.parseStringPromise(forecastRes.data).then(forecastData => {
			const forecasts = forecastData?.ActualForecast?.Custom?.[0]?.WeatherForecast || [];

			const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
			const todayForecast = forecasts.find(f => f.ValidFor?.[0] === today);

			if (todayForecast) {
				const desc = todayForecast.WeatherDescription?.[0] || '';

				// Extract "between 21 °C and 27 °C"
				const match = desc.match(/between (\d{1,2}) ?°C and (\d{1,2}) ?°C/);
				if (match) {
					forecastMin = match[1];
					forecastMax = match[2];
				}
			}
		});


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
