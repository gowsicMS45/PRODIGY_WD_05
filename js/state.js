window.NimbusState = (() => {

  const _state = {
    unit: 'metric',
    currentCity: null,
    weatherData: null,
    forecastData: null,
    lastUpdated: null,
    searchHistory: [],
    isLoading: false,
    hasError: false,
    errorMessage: '',
  };

  const _listeners = {};

  function on(key, cb) {
    if (!_listeners[key]) _listeners[key] = [];
    _listeners[key].push(cb);
  }

  function set(patch) {
    for (const [key, val] of Object.entries(patch)) {
      const old = _state[key];
      _state[key] = val;
      if (_listeners[key]) {
        _listeners[key].forEach(cb => cb(val, old));
      }
    }
  }

  function get(key) {
    return _state[key];
  }

  const HISTORY_KEY = 'nimbus_history';
  const HISTORY_MAX = 6;

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) _state.searchHistory = JSON.parse(raw);
    } catch (_) {
      _state.searchHistory = [];
    }
  }

  function addHistory(city) {
    const name = city.trim();
    if (!name) return;
    _state.searchHistory = [
      name,
      ..._state.searchHistory.filter(c => c.toLowerCase() !== name.toLowerCase())
    ].slice(0, HISTORY_MAX);

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(_state.searchHistory));
    } catch (_) { }

    if (_listeners['searchHistory']) {
      _listeners['searchHistory'].forEach(cb => cb(_state.searchHistory));
    }
  }

  function clearHistory() {
    _state.searchHistory = [];
    try { localStorage.removeItem(HISTORY_KEY); } catch (_) { }
    if (_listeners['searchHistory']) {
      _listeners['searchHistory'].forEach(cb => cb([]));
    }
  }

  const UNIT_KEY = 'nimbus_unit';
  const LAST_CITY_KEY = 'nimbus_last_city';

  function loadUnit() {
    const saved = localStorage.getItem(UNIT_KEY);
    if (saved === 'imperial') _state.unit = 'imperial';
  }

  function saveUnit(unit) {
    _state.unit = unit;
    try { localStorage.setItem(UNIT_KEY, unit); } catch (_) { }
    if (_listeners['unit']) {
      _listeners['unit'].forEach(cb => cb(unit));
    }
  }

  function toggleUnit() {
    const next = _state.unit === 'metric' ? 'imperial' : 'metric';
    saveUnit(next);
    return next;
  }

  function saveLastCity(city) {
    try { localStorage.setItem(LAST_CITY_KEY, city); } catch (_) { }
  }

  function getLastCity() {
    try { return localStorage.getItem(LAST_CITY_KEY) || null; } catch (_) { return null; }
  }

  function init() {
    loadHistory();
    loadUnit();
  }

  return { on, set, get, init, addHistory, clearHistory, toggleUnit, saveUnit, saveLastCity, getLastCity };

})();
