window.NimbusAPI = (() => {

    const WEATHER_BASE = 'https://api.open-meteo.com/v1/forecast';
    const GEO_BASE = 'https://geocoding-api.open-meteo.com/v1/search';
    const NOMINATIM = 'https://nominatim.openstreetmap.org';
    const TIMEOUT_MS = 10000;
    const DEMO_MODE = false;

    const WMO = {
        0: { desc: 'Clear sky', main: 'Clear', icon: '01', id: 800 },
        1: { desc: 'Mainly clear', main: 'Clear', icon: '01', id: 800 },
        2: { desc: 'Partly cloudy', main: 'Clouds', icon: '02', id: 801 },
        3: { desc: 'Overcast', main: 'Clouds', icon: '04', id: 804 },
        45: { desc: 'Foggy', main: 'Mist', icon: '50', id: 741 },
        48: { desc: 'Icy fog', main: 'Mist', icon: '50', id: 741 },
        51: { desc: 'Light drizzle', main: 'Drizzle', icon: '09', id: 300 },
        53: { desc: 'Moderate drizzle', main: 'Drizzle', icon: '09', id: 301 },
        55: { desc: 'Dense drizzle', main: 'Drizzle', icon: '09', id: 302 },
        61: { desc: 'Slight rain', main: 'Rain', icon: '10', id: 500 },
        63: { desc: 'Moderate rain', main: 'Rain', icon: '10', id: 501 },
        65: { desc: 'Heavy rain', main: 'Rain', icon: '10', id: 502 },
        71: { desc: 'Slight snow', main: 'Snow', icon: '13', id: 600 },
        73: { desc: 'Moderate snow', main: 'Snow', icon: '13', id: 601 },
        75: { desc: 'Heavy snow', main: 'Snow', icon: '13', id: 602 },
        77: { desc: 'Snow grains', main: 'Snow', icon: '13', id: 611 },
        80: { desc: 'Slight rain showers', main: 'Rain', icon: '09', id: 520 },
        81: { desc: 'Moderate rain showers', main: 'Rain', icon: '09', id: 521 },
        82: { desc: 'Violent rain showers', main: 'Rain', icon: '09', id: 522 },
        85: { desc: 'Slight snow showers', main: 'Snow', icon: '13', id: 620 },
        86: { desc: 'Heavy snow showers', main: 'Snow', icon: '13', id: 621 },
        95: { desc: 'Thunderstorm', main: 'Thunderstorm', icon: '11', id: 200 },
        96: { desc: 'Thunderstorm w/ hail', main: 'Thunderstorm', icon: '11', id: 201 },
        99: { desc: 'Thunderstorm + hail', main: 'Thunderstorm', icon: '11', id: 202 },
    };
    const getWMO = code => WMO[code] || { desc: 'Unknown', main: 'Clouds', icon: '03', id: 802 };

    const _inFlight = new Map();
    function dedupe(key, fn) {
        if (!_inFlight.has(key)) {
            const p = fn().finally(() => _inFlight.delete(key));
            _inFlight.set(key, p);
        }
        return _inFlight.get(key);
    }

    async function fetchT(url) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
        try {
            const res = await fetch(url, { signal: ctrl.signal });
            clearTimeout(timer);
            return res;
        } catch (err) {
            clearTimeout(timer);
            if (err.name === 'AbortError') throw new Error('Request timed out. Check your connection.');
            throw new Error('Network error. Please check your connection.');
        }
    }

    async function geocodeCity(city) {
        return dedupe(`geo:${city.toLowerCase()}`, async () => {
            const res = await fetchT(`${GEO_BASE}?name=${encodeURIComponent(city)}&count=5&language=en&format=json`);
            if (!res.ok) throw new Error('Geocoding service unavailable.');
            const data = await res.json();
            if (!data.results?.length) throw new Error(`"${city}" not found. Try a different name.`);
            return data.results[0];
        });
    }

    async function searchCities(query) {
        if (!query || query.length < 2) return [];
        try {
            const res = await fetchT(`${GEO_BASE}?name=${encodeURIComponent(query)}&count=6&language=en&format=json`);
            if (!res.ok) return [];
            const data = await res.json();
            return data.results || [];
        } catch { return []; }
    }

    async function reverseGeocode(lat, lon) {
        try {
            const res = await fetchT(`${NOMINATIM}/reverse?format=json&lat=${lat}&lon=${lon}`);
            if (!res.ok) return { name: 'Your Location', country: '' };
            const data = await res.json();
            const addr = data.address || {};
            const name = addr.city || addr.town || addr.village || addr.municipality || addr.county || 'Your Location';
            return { name, country: addr.country_code?.toUpperCase() || '' };
        } catch { return { name: 'Your Location', country: '' }; }
    }

    function buildURL(lat, lon) {
        return `${WEATHER_BASE}?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,relative_humidity_2m,apparent_temperature,` +
            `weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,visibility` +
            `&hourly=temperature_2m,weather_code,wind_speed_10m,precipitation_probability` +
            `&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max` +
            `&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto&forecast_days=2`;
    }

    async function fetchRaw(lat, lon) {
        return dedupe(`raw:${lat.toFixed(3)}:${lon.toFixed(3)}`, async () => {
            const res = await fetchT(buildURL(lat, lon));
            if (!res.ok) throw new Error('Weather service unavailable. Please try again.');
            return res.json();
        });
    }

    async function fetchCityBundle(city) {
        return dedupe(`bundle:${city.toLowerCase()}`, async () => {
            const geo = await geocodeCity(city);
            const raw = await fetchRaw(geo.latitude, geo.longitude);
            return { geo, raw };
        });
    }

    function toShape(raw, location) {
        const c = raw.current;
        const daily = raw.daily;
        const tz = raw.utc_offset_seconds || 0;
        const wmo = getWMO(c.weather_code);

        const nowMs = Date.now();
        const srMs = new Date(daily.sunrise[0] + 'Z').getTime() - tz * 1000;
        const ssMs = new Date(daily.sunset[0] + 'Z').getTime() - tz * 1000;
        const isNight = nowMs < srMs || nowMs > ssMs;
        const iconSuffix = isNight ? 'n' : 'd';

        const srUnix = Math.floor(new Date(daily.sunrise[0] + 'Z').getTime() / 1000) - tz;
        const ssUnix = Math.floor(new Date(daily.sunset[0] + 'Z').getTime() / 1000) - tz;

        const dewPoint = +(c.temperature_2m - (100 - c.relative_humidity_2m) / 5).toFixed(1);

        return {
            coord: { lat: raw.latitude, lon: raw.longitude },
            weather: [{ id: wmo.id, main: wmo.main, description: wmo.desc, icon: `${wmo.icon}${iconSuffix}` }],
            main: {
                temp: c.temperature_2m,
                feels_like: c.apparent_temperature,
                temp_min: daily.temperature_2m_min[0],
                temp_max: daily.temperature_2m_max[0],
                pressure: Math.round(c.pressure_msl),
                humidity: c.relative_humidity_2m,
                dew_point: dewPoint,
            },
            visibility: c.visibility != null ? Math.min(c.visibility, 10000) : 10000,
            wind: { speed: c.wind_speed_10m, deg: c.wind_direction_10m },
            clouds: { all: c.cloud_cover },
            dt: Math.floor(nowMs / 1000),
            sys: { country: location.country || '', sunrise: srUnix, sunset: ssUnix },
            timezone: tz,
            name: location.name || 'Unknown',
            uv_index: daily.uv_index_max?.[0] ?? null,
            precip_prob: daily.precipitation_probability_max?.[0] ?? null,
            _rawHourly: raw.hourly,
            _utcOffset: tz,
        };
    }

    function buildForecast(raw) {
        const hourly = raw.hourly;
        const nowMs = Date.now();
        const tz = raw.utc_offset_seconds || 0;
        let startIdx = 0;

        for (let i = 0; i < hourly.time.length; i++) {
            if (new Date(hourly.time[i] + 'Z').getTime() - tz * 1000 >= nowMs) {
                startIdx = i; break;
            }
        }

        const slots = [];
        for (let i = startIdx; slots.length < 5 && i < hourly.time.length; i += 3) {
            const wmo = getWMO(hourly.weather_code[i]);
            const slotUnix = Math.floor(new Date(hourly.time[i] + 'Z').getTime() / 1000) - tz;
            slots.push({
                dt: slotUnix,
                main: { temp: hourly.temperature_2m[i] },
                weather: [{ id: wmo.id, main: wmo.main, description: wmo.desc, icon: `${wmo.icon}d` }],
                wind: { speed: hourly.wind_speed_10m[i] },
                precip_prob: hourly.precipitation_probability?.[i] ?? null,
            });
        }
        return { list: slots };
    }

    async function getCurrentWeatherByCity(city) {
        const { geo, raw } = await fetchCityBundle(city);
        return toShape(raw, { name: geo.name, country: geo.country_code?.toUpperCase() });
    }

    async function getCurrentWeatherByCoords(lat, lon) {
        const [raw, loc] = await Promise.all([fetchRaw(lat, lon), reverseGeocode(lat, lon)]);
        return toShape(raw, loc);
    }

    async function getForecastByCity(city) {
        const { raw } = await fetchCityBundle(city);
        return buildForecast(raw);
    }

    async function getForecastByCoords(lat, lon) {
        const raw = await fetchRaw(lat, lon);
        return buildForecast(raw);
    }

    function getUserCoords() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) { reject(new Error('Geolocation not supported.')); return; }
            navigator.geolocation.getCurrentPosition(
                p => {
                    const lat = p.coords.latitude;
                    const lon = p.coords.longitude;
                    const acc = p.coords.accuracy;
                    console.log(`[Nimbus] GPS fix → lat:${lat}, lon:${lon}, accuracy:${acc}m (source: ${acc < 100 ? 'GPS' : 'Network/IP'})`);
                    resolve({ lat, lon });
                },
                e => reject(new Error(
                    e.code === 1 ? 'Location denied. Please search manually.' :
                        e.code === 2 ? 'Location unavailable. Please search manually.' :
                            'Location timed out. Please try again.'
                )),
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        });
    }

    function getIconUrl(code, size = '2x') {
        return `https://openweathermap.org/img/wn/${code}@${size}.png`;
    }

    function getWeatherTheme(id, night = false) {
        if (night) return 'weather-night';
        if (id >= 200 && id < 300) return 'weather-thunder';
        if (id >= 300 && id < 600) return 'weather-rain';
        if (id >= 600 && id < 700) return 'weather-snow';
        if (id >= 700 && id < 800) return 'weather-mist';
        if (id === 800) return 'weather-sunny';
        return 'weather-cloudy';
    }

    function getParticleMode(id, night = false) {
        if (night) return 'stars';
        if (id >= 200 && id < 300) return 'lightning';
        if (id >= 300 && id < 600) return 'rain';
        if (id >= 600 && id < 700) return 'snow';
        if (id === 800) return 'sparkle';
        return 'clouds';
    }

    function formatUnixTime(unix, tz = 0) {
        const d = new Date((unix + tz) * 1000);
        return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    }

    function isNightTime(w) {
        if (!w?.sys) return false;
        return w.dt < w.sys.sunrise || w.dt > w.sys.sunset;
    }

    return {
        DEMO_MODE, searchCities,
        getCurrentWeatherByCity, getCurrentWeatherByCoords,
        getForecastByCity, getForecastByCoords,
        getUserCoords, reverseGeocode, getIconUrl,
        getWeatherTheme, getParticleMode,
        formatUnixTime, isNightTime,
    };
})();
