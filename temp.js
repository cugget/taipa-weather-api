const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const app = express();
const port = process.env.PORT || 3000;

app.get('/taipa-weather', async (req, res) => {
    try {
        const response = await axios.get('https://xml.smg.gov.mo/e_actualweather.xml');
        xml2js.parseString(response.data, (err, result) => {
            if (err) return res.status(500).json({ error: 'Error parsing XML' });

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
        res.status(500).json({ error: 'Error fetching data' });
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));
