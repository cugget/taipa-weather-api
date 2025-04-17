const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Welcome to the Taipa Weather API! Use /taipa-weather for current and forecast data.');
});

app.get('/taipa-weather', async (req, res) => {
  try {
    // Step 1: Fetch current weather XML
    const currentRes = await axios.get('https://xml.smg.gov.mo/e_actualweather.xml', {
      headers: { 'User-Agent': 'TaipaWeatherAPI/1.0' },
      timeout: 10000
    });

    // Step 2: Fetch 7-day forecast XML
    const forecastRes = await axios.get('https://xml.smg.gov.mo/e_forecast.xml', {
      headers: { 'User-Agent': 'TaipaWeatherAPI/1.0' },
      timeout: 10000
    });

    // === Parse current weather ===
    const currentData = await xml2js.parseStringPromise(currentRes.data);
    const weatherReports = currentData?.ActualWeather?.Custom?.[0]?.WeatherReport || [];

    let selectedStation = weatherReports.find(report =>
      report.station?.[0]?.$?.code === 'TG'
    ) || weatherReports.find(report =>
      report.station?.[0]?.$?.code === 'FM'
    );

    if (!selectedStation) {
      return res.status(404).json({ error: 'No valid weather station found (TG or FM).' });
    }

    const station = selectedStation.station[0];
    const stationName = station.stationname?.[0] ?? 'Unknown';
    const stationCode = station.$.code ?? 'Unknown';
    const currentTemp = station.Temperature?.[0]?.Value?.[0] ?? 'N/A';
    const humidity = station.Humidity?.[0]?.Value?.[0] ?? 'N/A';

    // === Parse forecast weather ===
    const forecastData = await xml2js.parseStringPromise(forecastRes.data);
    const forecasts = forecastData?.ActualForecast?.Custom?.[0]?.WeatherForecast || [];

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const todayForecast = forecasts.find(f => f.ValidFor?.[0] === today);

    let forecastMin = 'N/A';
    let forecastMax = 'N/A';

    if (todayForecast) {
      const description = todayForecast.WeatherDescription?.[0] || '';
      const match = description.match(/between (\d{1,2}) ?°C and (\d{1,2}) ?°C/);
      if (match) {
        forecastMin = match[1];
        forecastMax = match[2];
      }
    }

    // === Final JSON Output ===
    res.json({
      station: stationName,
      stationCode,
      currentTemp,
      humidity,
      forecastMin,
      forecastMax
    });

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
