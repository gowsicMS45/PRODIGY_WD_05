(async function NimbusApp() {

    NimbusState.init();
    NimbusUI.updateUnitUI(NimbusState.get('unit'));
    NimbusUI.initParallax();
    NimbusUI.startClock();

    NimbusUI.runSplash(async () => { await autoLoad(); });

    async function loadByCity(city) {
        if (!city?.trim()) return;
        const unit = NimbusState.get('unit');
        NimbusState.set({ isLoading: true, hasError: false, currentCity: city.trim() });
        NimbusUI.showLoading(`Scanning skies over ${city}…`, '🔭');
        NimbusUI.setRefreshSpinning(true);
        let success = false;
        try {
            const [weather, forecast] = await Promise.all([
                NimbusAPI.getCurrentWeatherByCity(city),
                NimbusAPI.getForecastByCity(city),
            ]);
            NimbusState.set({ weatherData: weather, forecastData: forecast, lastUpdated: new Date(), hasError: false });
            NimbusState.addHistory(weather.name);
            NimbusUI.renderWeather(weather, forecast, unit);
            success = true;
        } catch (err) {
            NimbusState.set({ hasError: true, errorMessage: err.message });
            NimbusUI.showError(err.message);
        } finally {
            NimbusState.set({ isLoading: false });
            if (success) NimbusUI.setRefreshSynced();
            else NimbusUI.setRefreshSpinning(false);
            NimbusUI.hideSuggestions();
            NimbusUI.els.cityInput.value = '';
            NimbusUI.els.cityInput.blur();
        }
    }

    async function loadByCoords(lat, lon, triggerLocateLock = false) {
        const unit = NimbusState.get('unit');
        NimbusState.set({ isLoading: true, hasError: false });
        NimbusUI.showLoading('Reading your local sky…', '📡');
        NimbusUI.setRefreshSpinning(true);
        let success = false;
        try {
            const [weather, forecast] = await Promise.all([
                NimbusAPI.getCurrentWeatherByCoords(lat, lon),
                NimbusAPI.getForecastByCoords(lat, lon),
            ]);
            NimbusState.set({
                weatherData: weather, forecastData: forecast,
                lastUpdated: new Date(), currentCity: weather.name, hasError: false
            });
            NimbusState.addHistory(weather.name);
            NimbusUI.renderWeather(weather, forecast, unit);
            success = true;
        } catch (err) {
            NimbusState.set({ hasError: true, errorMessage: err.message });
            NimbusUI.showError(err.message);
        } finally {
            NimbusState.set({ isLoading: false });
            if (success) {
                NimbusUI.setRefreshSynced();
                if (triggerLocateLock) NimbusUI.setLocateLocked();
            } else {
                NimbusUI.setRefreshSpinning(false);
            }
            NimbusUI.setLocating(false);
        }
    }

    async function refresh() {
        if (NimbusState.get('isLoading')) return;
        const w = NimbusState.get('weatherData');
        const city = NimbusState.get('currentCity');
        if (w?.coord) await loadByCoords(w.coord.lat, w.coord.lon);
        else if (city) await loadByCity(city);
    }

    async function autoLoad() {
        NimbusUI.showLoading('Detecting your location…', '🌍');
        NimbusUI.setLocating(true);
        try {
            const { lat, lon } = await NimbusAPI.getUserCoords();
            await loadByCoords(lat, lon);
        } catch (_) {
            await loadByCity('London');
        } finally {
            NimbusUI.setLocating(false);
        }
    }

    const { cityInput, searchBar, searchToggleBtn, locateBtn, refreshBtn, unitToggleBtn } = NimbusUI.els;

    document.getElementById('searchSubmitBtn').addEventListener('click', () => {
        const v = cityInput.value.trim(); if (v) loadByCity(v);
    });

    cityInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { const v = cityInput.value.trim(); if (v) loadByCity(v); }
        if (e.key === 'Escape') NimbusUI.hideSuggestions();
    });

    let _acTimer = null;
    cityInput.addEventListener('input', () => {
        clearTimeout(_acTimer);
        const q = cityInput.value.trim();
        if (!q) {
            const h = NimbusState.get('searchHistory');
            if (h.length) NimbusUI.renderHistorySuggestions(h, loadByCity);
            else NimbusUI.hideSuggestions();
            return;
        }
        if (q.length < 2) return;
        _acTimer = setTimeout(async () => {
            const results = await NimbusAPI.searchCities(q);
            NimbusUI.renderAutoComplete(results, loadByCity);
        }, 350);
    });

    cityInput.addEventListener('focus', () => {
        if (!cityInput.value.trim()) {
            const h = NimbusState.get('searchHistory');
            if (h.length) NimbusUI.renderHistorySuggestions(h, loadByCity);
        }
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('#searchBar') && !e.target.closest('#searchSuggestions'))
            NimbusUI.hideSuggestions();
    });

    searchToggleBtn?.addEventListener('click', () => NimbusUI.toggleSearchBar());

    locateBtn.addEventListener('click', async () => {
        if (NimbusState.get('isLoading')) return;
        NimbusUI.setLocating(true);
        try {
            const { lat, lon } = await NimbusAPI.getUserCoords();
            await loadByCoords(lat, lon, true);
        } catch (err) {
            NimbusUI.showError(err.message);
            NimbusUI.setLocating(false);
        }
    });

    refreshBtn.addEventListener('click', refresh);

    unitToggleBtn.addEventListener('click', () => {
        if (NimbusState.get('isLoading')) return;
        NimbusState.toggleUnit();
        const unit = NimbusState.get('unit');
        NimbusUI.updateUnitUI(unit);
        NimbusUI.rerenderUnit(unit);
    });

    document.getElementById('retryBtn').addEventListener('click', async () => {
        const w = NimbusState.get('weatherData'); const city = NimbusState.get('currentCity');
        if (w?.coord) await loadByCoords(w.coord.lat, w.coord.lon);
        else if (city) await loadByCity(city);
        else await autoLoad();
    });

    NimbusState.on('searchHistory', h => {
        if (document.getElementById('searchSuggestions').classList.contains('visible'))
            NimbusUI.renderHistorySuggestions(h, loadByCity);
    });

    document.addEventListener('keydown', e => {
        if (e.key === '/' && document.activeElement !== cityInput) {
            e.preventDefault();
            NimbusUI.toggleSearchBar(true);
            setTimeout(() => cityInput.focus(), 160);
        }
    });

    setInterval(() => {
        if (!NimbusState.get('isLoading') && NimbusState.get('weatherData')) refresh();
    }, 10 * 60 * 1000);

})();
