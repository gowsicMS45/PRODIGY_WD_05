# Weather Web App

A cinematic weather application built with HTML, CSS, and JavaScript as part of the Prodigy InfoTech Web Development Internship.

## Overview

This project fetches real-time weather data and presents it through an interactive, responsive interface. It supports city search, location-based weather, unit switching, recent search history, and dynamic weather-based visuals.

## Features

- Fetch real-time weather data using a public weather API
- Detect user location with the Geolocation API
- Search weather by city name
- Display temperature, condition, feels-like value, humidity, wind speed, location, date, and time
- Dynamic full-screen background based on weather conditions
- Glassmorphism weather information panel
- Animated weather icons and smooth transitions
- Loading and error states
- Celsius/Fahrenheit unit toggle
- Recent search history using localStorage
- Refresh button for updated weather data
- Fully responsive layout

## Tech Stack

- HTML
- CSS
- JavaScript
- Fetch API
- Geolocation API
- localStorage

## Project Structure

```text
css/
  buttons.css
  style.css
js/
  api.js
  app.js
  state.js
  ui.js
index.html
```

## How It Works

The app requests weather data using JavaScript Fetch. If location permission is granted, it loads the user's local weather automatically. Users can also search for any city manually. The UI updates dynamically based on the received weather data, and recent searches are stored locally for quick access.

## Author

Gowsic M S

## Internship

Prodigy InfoTech - Web Development Internship
