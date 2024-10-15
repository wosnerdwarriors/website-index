document.addEventListener("DOMContentLoaded", loadCalendarData);

const urlParams = new URLSearchParams(window.location.search);
const debugMode = urlParams.has('debug') && urlParams.get('debug') === 'true';

let calendar;
let uniqueEvents = new Set();  // To track unique event names
let uniquePacks = new Set();   // To track unique pack names

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

        // Initialize calendar and filters
        initializeCalendar(data);
        setupFilters(data);
        setupViewButtons();
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
            timeZoneName: 'short'
        },
        events: [],
        eventClick: function(info) {
            displayEventDetails(info.event);
        }
    });

    calendar.render();

    // Initialize the filter lists
    populateEventFilterList(data.events);
    populatePackFilterList(data.packs);

    addEventsToCalendar(data, ['game-events', 'game-packs']);  // Call restored function
}

// Function to add events and packs to the calendar
function addEventsToCalendar(data, categoriesToShow) {
    const addedEvents = new Set();

    Object.entries(data.events).forEach(([eventId, event]) => {
        if (categoriesToShow.includes('game-events')) {
            const startTime = new Date(event['global-start-time-anchor']);
            const endTime = new Date(startTime);
            endTime.setUTCHours(startTime.getUTCHours() + event['event-length-hours']);

            const eventKey = `${event['entry-name']}-${startTime.toISOString()}`;
            if (!addedEvents.has(eventKey)) {
                calendar.addEvent({
                    title: event['entry-name'],
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
            const startTime = new Date(pack['global-start-time-anchor']);
            const endTime = new Date(startTime);
            endTime.setUTCHours(startTime.getUTCHours() + pack['event-length-hours']);

            const packKey = `${pack['entry-name']}-${startTime.toISOString()}`;
            if (!addedEvents.has(packKey)) {
                calendar.addEvent({
                    title: pack['entry-name'],
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
        <p>Repeats every: ${formatRepeat(eventData['repeat-every-days']) || 'N/A'}</p>
        <p>Event length: ${eventData['event-length-hours'] || 'N/A'} hours</p>
    `;
}

function formatRepeat(repeatDays) {
    if (repeatDays >= 30) {
        return `${Math.round(repeatDays / 30)} months`;
    } else if (repeatDays >= 7) {
        return `${Math.round(repeatDays / 7)} weeks`;
    } else {
        return `${repeatDays} days`;
    }
}

function formatDate(date) {
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

function setupFilters(data) {
    // Select all / Select none for events
    document.getElementById('select-all-events').addEventListener('click', () => selectAll('event-filter-list', true));
    document.getElementById('select-none-events').addEventListener('click', () => selectAll('event-filter-list', false));

    // Select all / Select none for packs
    document.getElementById('select-all-packs').addEventListener('click', () => selectAll('pack-filter-list', true));
    document.getElementById('select-none-packs').addEventListener('click', () => selectAll('pack-filter-list', false));
}

function populateEventFilterList(events) {
    const eventFilterList = document.getElementById('event-filter-list');
    const eventNames = new Set();

    Object.entries(events).forEach(([_, event]) => {
        eventNames.add(event['entry-name']);
        uniqueEvents.add(event['entry-name']);  // Track event name globally
    });

    eventNames.forEach(eventName => {
        const checkbox = createCheckbox(eventName, 'event');
        eventFilterList.appendChild(checkbox);
    });
}

function populatePackFilterList(packs) {
    const packFilterList = document.getElementById('pack-filter-list');
    const packNames = new Set();

    Object.entries(packs).forEach(([_, pack]) => {
        packNames.add(pack['entry-name']);
        uniquePacks.add(pack['entry-name']);  // Track pack name globally
    });

    packNames.forEach(packName => {
        const checkbox = createCheckbox(packName, 'pack');
        packFilterList.appendChild(checkbox);
    });
}

function createCheckbox(name, type) {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" checked> ${name}`;
    label.dataset.name = name;
    label.dataset.type = type;
    label.style.display = 'block';
    return label;
}

function selectAll(listId, checked) {
    const checkboxes = document.querySelectorAll(`#${listId} input[type="checkbox"]`);
    checkboxes.forEach(checkbox => {
        checkbox.checked = checked;
    });
}

// Handle calendar view buttons
function setupViewButtons() {
    document.getElementById('month-view').addEventListener('click', function() {
        switchView('dayGridMonth', this);
    });
    document.getElementById('week-view').addEventListener('click', function() {
        switchView('timeGridWeek', this);
    });
    document.getElementById('day-view').addEventListener('click', function() {
        switchView('timeGridDay', this);
    });
    document.getElementById('agenda-view').addEventListener('click', function() {
        switchView('listMonth', this);
    });
}

function switchView(view, button) {
    calendar.changeView(view);
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline-primary');
    });
    button.classList.remove('btn-outline-primary');
    button.classList.add('btn-primary');
}
