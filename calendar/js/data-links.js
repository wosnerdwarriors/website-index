// Get data source URL from config
async function getCalendarDataUrl() {
    const configResponse = await fetch('/config.json');
    const config = await configResponse.json();
    return config.dataSources.calendar.url;
}

// Start with a placeholder URL; this will be replaced before use
let DATA_URL = null;

// Load config and update URL immediately
(async function loadConfig() {
    DATA_URL = await getCalendarDataUrl();
    console.log('Calendar data will be loaded from:', DATA_URL);
})();

