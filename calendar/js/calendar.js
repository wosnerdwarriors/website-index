document.addEventListener("DOMContentLoaded", loadCalendarData);

const urlParams = new URLSearchParams(window.location.search);
const debugMode = urlParams.has('debug') && urlParams.get('debug') === 'true';

let calendar;
const currentTimezone = 'UTC';  // Hard-coded to UTC

async function loadCalendarData() {
    try {
        const response = await fetch(DATA_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (debugMode) {
            console.debug("Loaded data:", data);
        }

        initializeCalendar(data);
        setupFilters(data);
    } catch (error) {
        console.error("Error fetching calendar data:", error);
    }
}

function initializeCalendar(data) {
    const calendarEl = document.getElementById('calendar');

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        firstDay: 1,
        timeZone: 'UTC',  // Force calendar to use UTC
        eventTimeFormat: { // Display format for events
            hour: '2-digit',
            minute: '2-digit',
            meridiem: false,
            timeZoneName: 'short'  // Always display UTC
        },
        events: [],
        eventClick: function(info) {
            displayEventDetails(info.event);
        }
    });

    calendar.render();

    addEventsToCalendar(data, ['game-events', 'game-packs']);
}

function setupFilters(data) {
    const gameEventsCheckbox = document.getElementById('show-game-events');
    const gamePacksCheckbox = document.getElementById('show-game-packs');

    gameEventsCheckbox.addEventListener('change', () => filterEvents(data));
    gamePacksCheckbox.addEventListener('change', () => filterEvents(data));
}

function filterEvents(data) {
    const showGameEvents = document.getElementById('show-game-events').checked;
    const showGamePacks = document.getElementById('show-game-packs').checked;

    calendar.removeAllEvents();

    const categoriesToShow = [];
    if (showGameEvents) categoriesToShow.push('game-events');
    if (showGamePacks) categoriesToShow.push('game-packs');

    addEventsToCalendar(data, categoriesToShow);
}

function addEventsToCalendar(data, categoriesToShow) {
    const addedEvents = new Set();

    Object.entries(data.events).forEach(([eventId, event]) => {
        if (categoriesToShow.includes('game-events')) {
            // Directly parse ISO 8601 time as Date (UTC)
            const startTime = new Date(event['global-start-time-anchor']);
            const endTime = new Date(startTime);
            endTime.setUTCHours(startTime.getUTCHours() + event['event-length-hours']);

            const eventKey = `${event['event-name']}-${startTime.toISOString()}`;
            if (!addedEvents.has(eventKey)) {
                calendar.addEvent({
                    title: event['event-name'],
                    start: startTime,
                    end: endTime,
                    allDay: isAllDayEvent(event),
                    color: 'blue'
                });
                addedEvents.add(eventKey);

                if (debugMode) {
                    console.debug("Added event:", event);
                }
            }
        }
    });

    Object.entries(data.packs).forEach(([packId, pack]) => {
        if (categoriesToShow.includes('game-packs')) {
            // Directly parse ISO 8601 time as Date (UTC)
            const startTime = new Date(pack['global-start-time-anchor']);
            const endTime = new Date(startTime);
            endTime.setUTCHours(startTime.getUTCHours() + pack['event-length-hours']);

            const packKey = `${pack['pack-name']}-${startTime.toISOString()}`;
            if (!addedEvents.has(packKey)) {
                calendar.addEvent({
                    title: pack['pack-name'],
                    start: startTime,
                    end: endTime,
                    allDay: isAllDayEvent(pack),
                    color: 'green'
                });
                addedEvents.add(packKey);

                if (debugMode) {
                    console.debug("Added pack:", pack);
                }
            }
        }
    });
}

function isAllDayEvent(item) {
    return item['global-start-time-anchor'].endsWith('00:00:00Z') && item['event-length-hours'] % 24 === 0;
}

function displayEventDetails(event) {
    const specificDetails = document.getElementById('specific-event-details');
    const generalDetails = document.getElementById('general-event-details');

    if (!specificDetails || !generalDetails) {
        console.error('Details containers missing.');
        return;
    }

    const startDate = formatDate(event.start);
    const endDate = formatDate(event.end);

    specificDetails.innerHTML = `
        <h4>Specific Event Details</h4>
        <p>Title: ${event.title}</p>
        <p>Start: ${startDate}</p>
        <p>End: ${endDate}</p>
    `;

    const eventData = event.extendedProps;

    generalDetails.innerHTML = `
        <h4>General Event Information</h4>
        <p>Category: ${eventData.category || 'N/A'}</p>
        <p>Repeats every: ${eventData['repeat-every-days'] || 'N/A'} days</p>
        <p>Event length: ${eventData['event-length-hours'] || 'N/A'} hours</p>
    `;
}

function formatDate(date) {
    // Always format in UTC
    return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
        timeZoneName: 'short'
    }).format(date);
}
