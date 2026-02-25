window.NimbusUI = (() => {

    const $ = id => document.getElementById(id);

    const els = {
        body: document.body,
        loadingView: $('loadingView'),
        errorView: $('errorView'),
        dashboard: $('dashboard'),
        loadingText: $('loadingText'),
        loaderEmoji: $('loaderEmoji'),
        errorMsg: $('errorMsg'),
        cityName: $('cityName'),
        countryName: $('countryName'),
        liveClock: $('liveClock'),
        tempValue: $('tempValue'),
        tempUnitDisplay: $('tempUnitDisplay'),
        weatherIconImg: $('weatherIconImg'),
        conditionLabel: $('conditionLabel'),
        dateLabel: $('dateLabel'),
        feelsLikeVal: $('feelsLikeVal'),
        humidityVal: $('humidityVal'),
        humidityBar: $('humidityBar'),
        windVal: $('windVal'),
        windBar: $('windBar'),
        windDirLabel: $('windDirLabel'),
        compassNeedle: $('compassNeedle'),
        uvVal: $('uvVal'),
        uvLevel: $('uvLevel'),
        uvBar: $('uvBar'),
        visibilityVal: $('visibilityVal'),
        visibilityBar: $('visibilityBar'),
        sunriseVal: $('sunriseVal'),
        sunsetVal: $('sunsetVal'),
        pressureVal: $('pressureVal'),
        dewPointVal: $('dewPointVal'),
        minMaxVal: $('minMaxVal'),
        precipVal: $('precipVal'),
        forecastScroll: $('forecastScroll'),
        adviceText: $('adviceText'),
        sparklineWrap: $('sparklineWrap'),
        particleCanvas: $('particleCanvas'),
        refreshBtn: $('refreshBtn'),
        unitC: $('unitC'),
        unitF: $('unitF'),
        unitToggleBtn: $('unitToggleBtn'),
        introSplash: $('introSplash'),
        splashBarFill: $('splashBarFill'),
        cityInput: $('cityInput'),
        searchBar: $('searchBar'),
        searchSuggestions: $('searchSuggestions'),
        searchToggleBtn: $('searchToggleBtn'),
        locateBtn: $('locateBtn'),
    };

    const toF = c => (c * 9 / 5 + 32);
    const kmhToMph = k => k * 0.621371;

    function dispTemp(celsius, unit) {
        return Math.round(unit === 'imperial' ? toF(celsius) : celsius);
    }
    function dispTempSym(unit) { return unit === 'imperial' ? '°F' : '°C'; }

    function dispWind(kmh, unit) {
        return unit === 'imperial'
            ? `${Math.round(kmhToMph(kmh))} mph`
            : `${Math.round(kmh)} km/h`;
    }

    function showLoading(msg = 'Fetching your weather…', emoji = '⛅') {
        els.loadingView.classList.remove('hidden');
        els.errorView.classList.add('hidden');
        els.dashboard.classList.add('hidden');
        if (els.loadingText) els.loadingText.textContent = msg;
        if (els.loaderEmoji) els.loaderEmoji.textContent = emoji;
    }

    function showError(msg = 'Something went wrong. Please try again.') {
        els.loadingView.classList.add('hidden');
        els.errorView.classList.remove('hidden');
        els.dashboard.classList.add('hidden');
        if (els.errorMsg) els.errorMsg.textContent = msg;
    }

    function showDashboard() {
        els.loadingView.classList.add('hidden');
        els.errorView.classList.add('hidden');
        els.dashboard.classList.add('hidden');
        requestAnimationFrame(() => requestAnimationFrame(() => els.dashboard.classList.remove('hidden')));
    }

    function runSplash(onComplete) {
        let pct = 0;
        const iv = setInterval(() => {
            pct = Math.min(pct + Math.random() * 18 + 5, 95);
            if (els.splashBarFill) els.splashBarFill.style.width = pct + '%';
        }, 120);
        setTimeout(() => {
            clearInterval(iv);
            if (els.splashBarFill) els.splashBarFill.style.width = '100%';
            setTimeout(() => {
                els.introSplash.classList.add('fade-out');
                setTimeout(onComplete, 600);
            }, 300);
        }, 1800);
    }

    let _clockIv = null;
    function startClock() {
        if (_clockIv) clearInterval(_clockIv);
        const tick = () => {
            const n = new Date();
            els.liveClock.textContent =
                `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}:${String(n.getSeconds()).padStart(2, '0')}`;
        };
        tick();
        _clockIv = setInterval(tick, 1000);
    }

    function renderWeather(weather, forecast, unit) {
        const isNight = NimbusAPI.isNightTime(weather);
        applyTheme(NimbusAPI.getWeatherTheme(weather.weather[0].id, isNight));
        applyTempGlow(weather.main.temp);
        startParticles(NimbusAPI.getParticleMode(weather.weather[0].id, isNight));

        els.cityName.textContent = weather.name || '—';
        els.countryName.textContent = (weather.sys?.country ? weather.sys.country + ' · ' : '') +
            (weather.coord ? `${weather.coord.lat.toFixed(2)}°, ${weather.coord.lon.toFixed(2)}°` : '');

        animateNumber(els.tempValue, dispTemp(weather.main.temp, unit), 700);
        els.tempUnitDisplay.textContent = dispTempSym(unit);
        els.feelsLikeVal.textContent =
            `${dispTemp(weather.main.feels_like, unit)}${dispTempSym(unit)}`;

        const iconUrl = NimbusAPI.getIconUrl(weather.weather[0].icon, '4x');
        if (els.weatherIconImg.src !== iconUrl) {
            els.weatherIconImg.style.opacity = '0';
            els.weatherIconImg.src = iconUrl;
            els.weatherIconImg.onload = () => {
                els.weatherIconImg.style.transition = 'opacity 0.4s ease';
                els.weatherIconImg.style.opacity = '1';
            };
        }

        els.conditionLabel.textContent = capitalize(weather.weather[0].description);
        els.dateLabel.textContent = formatDate(new Date());

        if (els.adviceText) els.adviceText.textContent = getWeatherAdvice(weather);

        els.humidityVal.textContent = `${weather.main.humidity}%`;
        animateBar(els.humidityBar, weather.main.humidity, 100, 400);

        els.windVal.textContent = dispWind(weather.wind.speed, unit);
        animateBar(els.windBar, Math.min(weather.wind.speed, 100), 100, 400);
        renderWindCompass(weather.wind.deg);

        renderUV(weather.uv_index);

        const visKm = (weather.visibility / 1000).toFixed(1);
        els.visibilityVal.textContent = `${visKm} km`;
        animateBar(els.visibilityBar, Math.min(parseFloat(visKm), 10) * 10, 100, 400);

        const tz = weather.timezone || 0;
        els.sunriseVal.textContent = NimbusAPI.formatUnixTime(weather.sys.sunrise, tz);
        els.sunsetVal.textContent = NimbusAPI.formatUnixTime(weather.sys.sunset, tz);
        els.pressureVal.textContent = `${weather.main.pressure} hPa`;
        els.dewPointVal.textContent = `${dispTemp(weather.main.dew_point, unit)}${dispTempSym(unit)}`;
        els.minMaxVal.textContent =
            `${dispTemp(weather.main.temp_min, unit)}° / ${dispTemp(weather.main.temp_max, unit)}°`;
        if (els.precipVal) els.precipVal.textContent =
            weather.precip_prob != null ? `${weather.precip_prob}%` : '--';

        if (forecast?.list?.length) {
            renderForecast(forecast.list, unit, tz);
            renderSparkline(forecast.list, unit);
        }

        showDashboard();
    }

    function rerenderUnit(unit) {
        const w = NimbusState.get('weatherData');
        const f = NimbusState.get('forecastData');
        if (!w) return;

        const sym = dispTempSym(unit);

        animateNumber(els.tempValue, dispTemp(w.main.temp, unit), 400);
        els.tempUnitDisplay.textContent = sym;
        els.feelsLikeVal.textContent = `${dispTemp(w.main.feels_like, unit)}${sym}`;
        els.windVal.textContent = dispWind(w.wind.speed, unit);
        els.dewPointVal.textContent = `${dispTemp(w.main.dew_point, unit)}${sym}`;
        els.minMaxVal.textContent = `${dispTemp(w.main.temp_min, unit)}° / ${dispTemp(w.main.temp_max, unit)}°`;
        updateUnitUI(unit);

        if (f?.list?.length) {
            renderForecast(f.list, unit, w.timezone || 0);
            renderSparkline(f.list, unit);
        }
    }

    function renderForecast(list, unit, tz = 0) {
        els.forecastScroll.innerHTML = '';
        list.slice(0, 5).forEach((item, i) => {
            const hour = NimbusAPI.formatUnixTime(item.dt, tz);
            const temp = dispTemp(item.main.temp, unit);
            const sym = dispTempSym(unit);
            const icon = NimbusAPI.getIconUrl(item.weather[0].icon, '2x');
            const cond = capitalize(item.weather[0].description);
            const precip = item.precip_prob != null ? `<span class="fc-precip">💧 ${item.precip_prob}%</span>` : '';

            const card = document.createElement('div');
            card.className = 'forecast-item';
            card.setAttribute('role', 'listitem');
            card.style.animationDelay = `${i * 0.06}s`;
            card.innerHTML = `
        <span class="forecast-hour">${hour}</span>
        <img class="forecast-icon" src="${icon}" alt="${cond}" loading="lazy" />
        <span class="forecast-temp">${temp}${sym}</span>
        <span class="forecast-cond">${cond}</span>
        ${precip}
      `;
            els.forecastScroll.appendChild(card);
        });
    }

    function renderSparkline(list, unit) {
        if (!els.sparklineWrap) return;
        const temps = list.slice(0, 5).map(f => dispTemp(f.main.temp, unit));
        if (!temps.length) return;
        const min = Math.min(...temps) - 2;
        const max = Math.max(...temps) + 2;
        const W = 220, H = 48;

        const pts = temps.map((t, i) => {
            const x = (i / (temps.length - 1)) * (W - 10) + 5;
            const y = H - 4 - ((t - min) / ((max - min) || 1)) * (H - 8);
            return `${x},${y}`;
        }).join(' ');

        const dots = temps.map((t, i) => {
            const x = (i / (temps.length - 1)) * (W - 10) + 5;
            const y = H - 4 - ((t - min) / ((max - min) || 1)) * (H - 8);
            const sym = dispTempSym(unit);
            return `<circle cx="${x}" cy="${y}" r="3.5" fill="rgba(255,255,255,0.9)"
        stroke="rgba(255,255,255,0.4)" stroke-width="1">
        <title>${t}${sym}</title></circle>`;
        }).join('');

        els.sparklineWrap.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="sparkline-svg" aria-label="Temperature trend">
        <defs>
          <linearGradient id="spkGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="rgba(255,255,255,0.3)"/>
            <stop offset="100%" stop-color="rgba(255,255,255,0.8)"/>
          </linearGradient>
        </defs>
        <polyline points="${pts}" fill="none"
          stroke="url(#spkGrad)" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round"/>
        ${dots}
      </svg>`;
    }

    function renderWindCompass(deg) {
        if (!deg && deg !== 0) return;
        if (els.compassNeedle) {
            els.compassNeedle.style.transform = `translateX(-50%) rotate(${deg}deg)`;
        }
        if (els.windDirLabel) els.windDirLabel.textContent = degToDir(deg);
    }

    function degToDir(deg) {
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        return dirs[Math.round(deg / 45) % 8];
    }

    const UV_LEVELS = [
        { max: 2, label: 'Low', color: '#22c55e' },
        { max: 5, label: 'Moderate', color: '#eab308' },
        { max: 7, label: 'High', color: '#f97316' },
        { max: 10, label: 'Very High', color: '#ef4444' },
        { max: 99, label: 'Extreme', color: '#a855f7' },
    ];

    function renderUV(uv) {
        if (uv == null) { if (els.uvVal) els.uvVal.textContent = '--'; return; }
        const lvl = UV_LEVELS.find(l => uv <= l.max) || UV_LEVELS[UV_LEVELS.length - 1];
        if (els.uvVal) els.uvVal.textContent = uv.toFixed(1);
        if (els.uvLevel) { els.uvLevel.textContent = lvl.label; els.uvLevel.style.color = lvl.color; }
        if (els.uvBar) { els.uvBar.style.width = `${Math.min(uv / 11 * 100, 100)}%`; els.uvBar.style.background = lvl.color; }
    }

    function getWeatherAdvice(w) {
        const id = w.weather[0].id;
        const temp = w.main.temp;
        const wind = w.wind.speed;
        if (id >= 200 && id < 300) return '⚡ Thunderstorm alert — stay indoors and away from windows.';
        if (id >= 300 && id < 400) return '🌂 Light drizzle out there — a hood or umbrella helps.';
        if (id >= 500 && id < 600) return '☂️ It\'s raining — carry an umbrella and wear waterproof shoes.';
        if (id >= 600 && id < 700) return '❄️ Snow falling — dress warmly and drive carefully.';
        if (id >= 700 && id < 800) return '🌫 Poor visibility due to mist — drive with headlights on.';
        if (id === 800 && temp > 33) return '🥵 Scorching hot — stay hydrated and seek shade midday.';
        if (id === 800 && temp > 22) return '😎 Beautiful sunny day — perfect for being outdoors!';
        if (id === 800 && temp < 5) return '🥶 Clear but freezing! Bundle up well before heading out.';
        if (id === 800) return '☀️ Pleasant clear skies today — enjoy your day!';
        if (wind > 50) return '💨 Very strong winds — secure loose outdoor items.';
        if (temp < 0) return '🧊 Temperatures below freezing — watch for ice on roads.';
        if (temp > 30) return '🌡 Very warm today — keep cool and drink plenty of water.';
        return '🌤 Mixed conditions today — check back for updates.';
    }

    const ALL_THEMES = ['weather-sunny', 'weather-cloudy', 'weather-rain', 'weather-snow', 'weather-thunder', 'weather-night', 'weather-mist'];

    function applyTheme(cls) {
        if (els.body.classList.contains(cls)) return;
        const ov = document.createElement('div');
        ov.className = 'theme-transition-overlay';
        document.body.appendChild(ov);
        requestAnimationFrame(() => {
            ov.classList.add('flash');
            setTimeout(() => {
                ALL_THEMES.forEach(t => els.body.classList.remove(t));
                els.body.classList.add(cls);
                ov.classList.remove('flash');
                setTimeout(() => ov.remove(), 400);
            }, 250);
        });
    }

    function applyTempGlow(celsius) {
        els.body.classList.toggle('temp-warm', celsius > 20);
        els.body.classList.toggle('temp-cool', celsius <= 20);
    }

    function updateUnitUI(unit) {
        els.unitC.classList.toggle('active', unit === 'metric');
        els.unitF.classList.toggle('active', unit === 'imperial');
    }

    function renderAutoComplete(results, onSelect) {
        if (!results.length) { hideSuggestions(); return; }
        els.searchSuggestions.innerHTML = results.map(r => {
            const flag = r.country_code ? getFlagEmoji(r.country_code) : '📍';
            const sub = [r.admin1, r.country].filter(Boolean).join(', ');
            return `<li class="suggestion-item" role="option" tabindex="0" data-name="${r.name}">
        <span class="suggestion-icon">${flag}</span>
        <span class="sug-main">${r.name}</span>
        <span class="sug-sub">${sub}</span>
      </li>`;
        }).join('');
        els.searchSuggestions.classList.add('visible');
        els.searchSuggestions.querySelectorAll('li').forEach(li => {
            const selectFn = () => { onSelect(li.dataset.name); hideSuggestions(); };
            li.addEventListener('click', selectFn);
            li.addEventListener('keydown', e => { if (e.key === 'Enter') selectFn(); });
        });
    }

    function renderHistorySuggestions(history, onSelect) {
        if (!history.length) { hideSuggestions(); return; }
        els.searchSuggestions.innerHTML = history.map(city =>
            `<li class="suggestion-item" role="option" tabindex="0">
        <span class="suggestion-icon">🕐</span>
        <span class="sug-main">${city}</span>
      </li>`
        ).join('') + `<li class="suggestion-item sug-clear" role="option" tabindex="0" data-action="clear">
        <span class="suggestion-icon">🗑</span><em>Clear history</em>
      </li>`;
        els.searchSuggestions.classList.add('visible');
        els.searchSuggestions.querySelectorAll('li').forEach(li => {
            li.addEventListener('click', () => {
                if (li.dataset.action === 'clear') { NimbusState.clearHistory(); hideSuggestions(); }
                else { onSelect(li.querySelector('.sug-main').textContent.trim()); hideSuggestions(); }
            });
        });
    }

    function hideSuggestions() {
        els.searchSuggestions.classList.remove('visible');
    }

    function getFlagEmoji(code) {
        return code.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
    }

    function toggleSearchBar(forceOpen) {
        const next = forceOpen !== undefined ? forceOpen : !els.searchBar.classList.contains('expanded');
        els.searchBar.classList.toggle('expanded', next);
        els.searchToggleBtn?.setAttribute('aria-expanded', String(next));
        if (next) setTimeout(() => els.cityInput.focus(), 150);
    }

    let _locateLockTimer = null;

    function setLocating(on) {
        const btn = els.locateBtn;
        if (!btn) return;
        clearTimeout(_locateLockTimer);
        if (on) {
            btn.classList.remove('locked');
            btn.classList.add('locating');
            const lbl = btn.querySelector('.lb-label');
            if (lbl) lbl.textContent = 'Scanning…';
        } else {
            btn.classList.remove('locating');
        }
    }

    function setLocateLocked() {
        const btn = els.locateBtn;
        if (!btn) return;
        btn.classList.remove('locating');
        btn.classList.add('locked');
        const lbl = btn.querySelector('.lb-label');
        if (lbl) lbl.textContent = 'Locked!';
        clearTimeout(_locateLockTimer);
        _locateLockTimer = setTimeout(() => {
            btn.classList.remove('locked');
            if (lbl) lbl.textContent = 'Locate';
        }, 2200);
    }

    let _syncedTimer = null;

    function setRefreshSpinning(on) {
        const btn = els.refreshBtn;
        if (!btn) return;
        clearTimeout(_syncedTimer);
        if (on) {
            btn.classList.remove('synced');
            btn.classList.add('syncing');
            const lbl = document.getElementById('rbLabel');
            if (lbl) lbl.textContent = 'Syncing…';
        } else {
            btn.classList.remove('syncing');
        }
    }

    function setRefreshSynced() {
        const btn = els.refreshBtn;
        if (!btn) return;
        btn.classList.remove('syncing');
        btn.classList.add('synced');
        const lbl = document.getElementById('rbLabel');
        if (lbl) lbl.textContent = 'Synced!';
        _spawnRefreshParticles();
        clearTimeout(_syncedTimer);
        _syncedTimer = setTimeout(() => {
            btn.classList.remove('synced');
            if (lbl) lbl.textContent = 'Sync';
        }, 2000);
    }

    function _spawnRefreshParticles() {
        const burst = document.getElementById('rbBurst');
        if (!burst) return;
        burst.innerHTML = '';
        const COUNT = 10;
        for (let i = 0; i < COUNT; i++) {
            const p = document.createElement('div');
            p.className = 'rb-particle burst';
            const angle = (360 / COUNT) * i;
            const dist = 28 + Math.random() * 14;
            const dur = (0.55 + Math.random() * 0.35).toFixed(2);
            const delay = (Math.random() * 0.12).toFixed(2);
            const hue = 270 + Math.round(Math.random() * 60);
            p.style.cssText = `--angle:${angle}deg;--dist:${dist}px;--dur:${dur}s;--delay:${delay}s;`;
            p.style.background = `hsl(${hue},80%,70%)`;
            p.style.boxShadow = `0 0 6px hsl(${hue},80%,70%)`;
            burst.appendChild(p);
        }
        setTimeout(() => { burst.innerHTML = ''; }, 1200);
    }

    function animateNumber(el, target, dur = 500) {
        const start = parseFloat(el.textContent) || 0;
        const diff = target - start;
        const t0 = performance.now();
        const step = ts => {
            const p = Math.min((ts - t0) / dur, 1);
            el.textContent = Math.round(start + diff * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    function animateBar(el, val, max, delay = 0) {
        if (!el) return;
        setTimeout(() => { el.style.width = `${Math.max(0, Math.min(100, (val / max) * 100))}%`; }, delay);
    }

    let _pAnim = null, _particles = [], _pMode = null;
    const CANVAS = els.particleCanvas;
    const CTX = CANVAS?.getContext('2d');

    function startParticles(mode) {
        if (_pMode === mode) return;
        _pMode = mode;
        if (_pAnim) { cancelAnimationFrame(_pAnim); _pAnim = null; }
        if (CTX) CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);
        if (!CTX) return;
        resizeCanvas();
        _particles = buildParticles(mode, CANVAS.width, CANVAS.height);
        const loop = () => { drawParticles(mode); _pAnim = requestAnimationFrame(loop); };
        _pAnim = requestAnimationFrame(loop);
    }

    function resizeCanvas() {
        if (!CANVAS) return;
        CANVAS.width = window.innerWidth;
        CANVAS.height = window.innerHeight;
    }
    window.addEventListener('resize', () => {
        resizeCanvas();
        if (_pMode) _particles = buildParticles(_pMode, CANVAS.width, CANVAS.height);
    });

    function buildParticles(mode, w, h) {
        const n = { rain: 200, snow: 100, stars: 140, sparkle: 60, clouds: 0, lightning: 6 }[mode] || 0;
        return Array.from({ length: n }, () => newParticle(mode, w, h, true));
    }

    function newParticle(mode, w, h, init = false) {
        const p = {};
        if (mode === 'rain') {
            p.x = Math.random() * w; p.y = init ? Math.random() * h : -20;
            p.len = Math.random() * 18 + 10; p.speed = Math.random() * 8 + 8; p.opacity = Math.random() * 0.4 + 0.3; p.a = 0.25;
        } else if (mode === 'snow') {
            p.x = Math.random() * w; p.y = init ? Math.random() * h : -10;
            p.r = Math.random() * 3 + 1.5; p.speed = Math.random() * 1.2 + 0.4; p.drift = (Math.random() - 0.5) * 0.7;
            p.opacity = Math.random() * 0.5 + 0.4; p.wb = Math.random() * Math.PI * 2; p.wbs = Math.random() * 0.03 + 0.01;
        } else if (mode === 'stars') {
            p.x = Math.random() * w; p.y = Math.random() * h;
            p.r = Math.random() * 1.8 + 0.3; p.opacity = Math.random() * 0.7 + 0.2;
            p.tw = Math.random() * Math.PI * 2; p.tws = Math.random() * 0.02 + 0.005;
        } else if (mode === 'sparkle') {
            p.x = Math.random() * w; p.y = init ? Math.random() * h : h + 10;
            p.r = Math.random() * 2.5 + 1; p.speed = Math.random() * 1.5 + 0.5;
            p.opacity = Math.random() * 0.6 + 0.2; p.life = Math.random() * 280 + 80;
            p.lived = init ? Math.random() * p.life : 0;
        } else if (mode === 'lightning') {
            p.active = false; p.timer = Math.random() * 200 + 60; p.elapsed = 0; p.flash = Math.random() * 8 + 4;
        }
        return p;
    }

    function drawParticles(mode) {
        CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);
        const w = CANVAS.width, h = CANVAS.height;
        _particles.forEach(p => {
            if (mode === 'rain') {
                CTX.save(); CTX.globalAlpha = p.opacity; CTX.strokeStyle = 'rgba(120,180,255,0.85)'; CTX.lineWidth = 1.2;
                CTX.beginPath(); CTX.moveTo(p.x, p.y); CTX.lineTo(p.x + Math.sin(p.a) * p.len, p.y + p.len); CTX.stroke(); CTX.restore();
                p.y += p.speed; p.x += Math.sin(p.a) * 2; if (p.y > h + 30) Object.assign(p, newParticle('rain', w, h));
            } else if (mode === 'snow') {
                p.wb += p.wbs;
                CTX.save(); CTX.globalAlpha = p.opacity; CTX.fillStyle = 'rgba(220,240,255,0.9)';
                CTX.beginPath(); CTX.arc(p.x + Math.sin(p.wb) * 2, p.y, p.r, 0, Math.PI * 2); CTX.fill(); CTX.restore();
                p.y += p.speed; p.x += p.drift; if (p.y > h + 10 || p.x < -10 || p.x > w + 10) Object.assign(p, newParticle('snow', w, h));
            } else if (mode === 'stars') {
                p.tw += p.tws; const a = p.opacity * (0.5 + 0.5 * Math.sin(p.tw));
                CTX.save(); CTX.globalAlpha = a; CTX.fillStyle = '#c8d8ff'; CTX.shadowColor = '#a0b8ff'; CTX.shadowBlur = p.r * 4;
                CTX.beginPath(); CTX.arc(p.x, p.y, p.r, 0, Math.PI * 2); CTX.fill(); CTX.restore();
            } else if (mode === 'sparkle') {
                p.lived++; if (p.lived > p.life) Object.assign(p, newParticle('sparkle', w, h));
                const a = p.opacity * Math.sin((p.lived / p.life) * Math.PI);
                CTX.save(); CTX.globalAlpha = a; CTX.fillStyle = 'rgba(255,220,100,0.9)'; CTX.shadowColor = 'rgba(255,180,50,0.8)'; CTX.shadowBlur = 10;
                CTX.beginPath(); CTX.arc(p.x, p.y - p.lived * p.speed * 0.18, p.r, 0, Math.PI * 2); CTX.fill(); CTX.restore();
            } else if (mode === 'lightning') {
                p.elapsed++;
                if (!p.active && p.elapsed >= p.timer) { p.active = true; p.elapsed = 0; p.bx = Math.random() * w; }
                if (p.active) {
                    if (p.elapsed < p.flash) {
                        const a = Math.random() * 0.5 + 0.15;
                        CTX.save(); CTX.globalAlpha = a; CTX.fillStyle = 'rgba(220,200,255,0.5)'; CTX.fillRect(0, 0, w, h); CTX.restore();
                        drawBolt(p.bx, 0, p.bx + (Math.random() - 0.5) * 80, h * 0.45, a * 0.9);
                    } else { p.active = false; p.elapsed = 0; p.timer = Math.random() * 280 + 100; p.flash = Math.random() * 8 + 4; }
                }
            }
        });
    }

    function drawBolt(x1, y1, x2, y2, a) {
        CTX.save(); CTX.globalAlpha = a; CTX.strokeStyle = 'rgba(200,180,255,0.9)'; CTX.lineWidth = 2; CTX.shadowColor = '#a080ff'; CTX.shadowBlur = 20;
        CTX.beginPath(); CTX.moveTo(x1, y1);
        for (let i = 1; i <= 8; i++) { const t = i / 8; CTX.lineTo(x1 + (x2 - x1) * t + (Math.random() - 0.5) * 55, y1 + (y2 - y1) * t); }
        CTX.stroke(); CTX.restore();
    }

    function initParallax() {
        const d1 = document.getElementById('bgDepth1');
        const d2 = document.getElementById('bgDepth2');
        document.addEventListener('mousemove', e => {
            const dx = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
            const dy = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
            if (d1) d1.style.transform = `translate(${dx * -18}px,${dy * -12}px) scale(1.05)`;
            if (d2) d2.style.transform = `translate(${dx * 12}px,${dy * 8}px) scale(0.97)`;
        });
    }

    function capitalize(s) { return s ? s.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ') : ''; }
    function formatDate(d) { return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }

    return {
        showLoading, showError, showDashboard, runSplash, startClock,
        renderWeather, rerenderUnit, renderForecast, updateUnitUI,
        renderAutoComplete, renderHistorySuggestions, hideSuggestions,
        toggleSearchBar, setRefreshSpinning, setRefreshSynced,
        setLocating, setLocateLocked,
        initParallax, applyTheme, els,
    };
})();
