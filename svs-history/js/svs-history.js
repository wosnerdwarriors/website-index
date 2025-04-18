document.addEventListener('DOMContentLoaded', function () {
    const stateSearch = document.getElementById('stateSearch');
    const stateSelectContainer = document.getElementById('stateSelectContainer');
    const dateSearch = document.getElementById('dateSearch');
    const dateSelectContainer = document.getElementById('dateSelectContainer');
    const tableHead = document.getElementById('tableHead').getElementsByTagName('tr')[0];
    const tableBody = document.getElementById('tableBody');
    const prepFilter = document.getElementById('prepFilter');
    const castleFilter = document.getElementById('castleFilter');
    const matchFilter = document.getElementById('matchFilter');
    const filterMessage = document.getElementById('filterMessage');
    
    let svsData = {};
    let selectedStates = {};
    let selectedSvsDates = [];
    let allSvsDates = [];
    let currentPage = 1;
    let statesPerPage = 50;

    // Ensure debug mode is enabled via URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const debug = urlParams.has('debug') && urlParams.get('debug') === 'true';

    if (debug) console.log('Debug mode enabled');

    // Add All States button functionality
    document.getElementById('addAllStatesBtn').addEventListener('click', () => {
        const checkboxes = stateSelectContainer.querySelectorAll('input[type="checkbox"]');
        selectedStates = {};  // Reset selected states
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            selectedStates[checkbox.value] = true;  // Add all states
        });
        if (debug) console.log('All states added:', selectedStates);
        renderTable();
    });

    // Clear All States button functionality
    document.getElementById('clearAllStatesBtn').addEventListener('click', () => {
        const checkboxes = stateSelectContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        selectedStates = {};  // Clear selected states
        if (debug) console.log('All states cleared.');
        renderTable();
    });

    // Add All Dates button functionality
    document.getElementById('addAllDatesBtn').addEventListener('click', () => {
        const checkboxes = dateSelectContainer.querySelectorAll('input[type="checkbox"]');
        selectedSvsDates = [];  // Reset selected dates
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            selectedSvsDates.push(checkbox.value);  // Add all dates
        });
        if (debug) console.log('All dates added:', selectedSvsDates);
        checkFilterAvailability(); // Check if filters should be enabled/disabled
        renderTable();
    });

    // Clear All Dates button functionality
    document.getElementById('clearAllDatesBtn').addEventListener('click', () => {
        const checkboxes = dateSelectContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        selectedSvsDates = [];  // Clear selected dates
        if (debug) console.log('All dates cleared.');
        checkFilterAvailability(); // Check if filters should be enabled/disabled
        renderTable();
    });

    // Define function to populate state select box
    function populateStateSelect() {
        const allStates = Object.keys(svsData).map(Number);  // Convert state keys to numbers

        stateSelectContainer.innerHTML = '';  // Clear previous options

        // Only loop through states that are in the JSON data
        allStates.forEach(state => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = state;
            checkbox.id = `state-${state}`;
            checkbox.classList.add('form-check-input');
            checkbox.checked = selectedStates[state] || false;
            checkbox.addEventListener('change', handleStateSelection);

            const label = document.createElement('label');
            label.classList.add('form-check-label');
            label.setAttribute('for', `state-${state}`);
            label.textContent = `State ${state}`;  // Display state number

            const div = document.createElement('div');
            div.classList.add('form-check');
            div.appendChild(checkbox);
            div.appendChild(label);

            stateSelectContainer.appendChild(div);
        });

        if (debug) console.log(`State checkboxes populated from JSON data:`, allStates);
    }

    // Define function to collect all SVS dates from all states
    function collectAllSvsDates() {
        let allDates = new Set();  // Use a Set to ensure unique dates

        // Collect dates from all states
        for (const state in svsData) {
            const dates = Object.keys(svsData[state]);
            dates.forEach(date => allDates.add(date));  // Add each date to the Set
        }

        // Convert Set back to Array and sort in reverse order (latest date first)
        allSvsDates = Array.from(allDates).sort((a, b) => new Date(b) - new Date(a));

        if (debug) console.log('All SVS dates collected and sorted (latest to oldest):', allSvsDates);
    }

    // Default: select the last 5 dates and reflect this in the UI
    function selectDefaultDates() {
        selectedSvsDates = allSvsDates.slice(0, 5);  // Select the latest 5 dates
        if (debug) console.log('Default selected dates:', selectedSvsDates);

        // Ensure these dates are selected in the date selection checkboxes
        const checkboxes = dateSelectContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (selectedSvsDates.includes(checkbox.value)) {
                checkbox.checked = true;
            }
        });

        checkFilterAvailability(); // Check if filters should be enabled/disabled
        renderTable(); // Trigger table rendering after setting default dates
    }

    // Default: select the first 10 states and reflect this in the UI
    function selectDefaultStates() {
        const checkboxes = stateSelectContainer.querySelectorAll('input[type="checkbox"]');
        let selectedCount = 0;
        checkboxes.forEach(checkbox => {
            if (selectedCount < 10) {
                checkbox.checked = true;
                selectedStates[checkbox.value] = true;
                selectedCount++;
            }
        });
        if (debug) console.log('Default selected states:', Object.keys(selectedStates));
    }

    // Populate date checkboxes
    function populateDateSelect() {
        dateSelectContainer.innerHTML = '';  // Clear previous options
        allSvsDates.forEach(date => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = date;
            checkbox.id = `date-${date}`;
            checkbox.classList.add('form-check-input');
            checkbox.checked = selectedSvsDates.includes(date);
            checkbox.addEventListener('change', handleDateSelection);

            const label = document.createElement('label');
            label.classList.add('form-check-label');
            label.setAttribute('for', `date-${date}`);
            label.textContent = date;

            const div = document.createElement('div');
            div.classList.add('form-check');
            div.appendChild(checkbox);
            div.appendChild(label);

            dateSelectContainer.appendChild(div);
        });

        if (debug) console.log('Date checkboxes populated (latest to oldest):', allSvsDates);
    }

    // Handle state selection changes
    function handleStateSelection(e) {
        const state = e.target.value;
        selectedStates[state] = e.target.checked;
        if (debug) console.log(`State ${state} selected:`, selectedStates[state]);
        renderTable();
    }

    // Handle SVS date selection changes
    function handleDateSelection(e) {
        const date = e.target.value;
        if (e.target.checked) {
            if (!selectedSvsDates.includes(date)) {
                selectedSvsDates.push(date);
            }
        } else {
            selectedSvsDates = selectedSvsDates.filter(d => d !== date);
        }

        if (debug) console.log('Updated selected SVS dates:', selectedSvsDates);

        checkFilterAvailability();  // Enable/Disable filters based on number of selected dates
        renderTable();
    }

    // Check if the filter dropdowns should be enabled or disabled
    function checkFilterAvailability() {
        if (selectedSvsDates.length === 1) {
            prepFilter.disabled = false;
            castleFilter.disabled = false;
            matchFilter.disabled = false;
            filterMessage.style.display = 'none';
        } else {
            prepFilter.disabled = true;
            castleFilter.disabled = true;
            matchFilter.disabled = true;
            filterMessage.style.display = 'inline';
        }
    }

    // Search functionality for states
    stateSearch.addEventListener('input', function () {
        const searchTerm = stateSearch.value.toLowerCase();
        const checkboxes = stateSelectContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            const label = checkbox.nextElementSibling.textContent.toLowerCase();
            const isVisible = label.includes(searchTerm);
            checkbox.parentElement.style.display = isVisible ? '' : 'none';
        });
        if (debug) console.log('State search updated with term:', searchTerm);
    });

    // Search functionality for dates
    dateSearch.addEventListener('input', function () {
        const searchTerm = dateSearch.value.toLowerCase();
        const checkboxes = dateSelectContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            const label = checkbox.nextElementSibling.textContent.toLowerCase();
            const isVisible = label.includes(searchTerm);
            checkbox.parentElement.style.display = isVisible ? '' : 'none';
        });
        if (debug) console.log('Date search updated with term:', searchTerm);
    });

    // Pagination logic
    function updatePagination() {
        const totalPages = Math.ceil(Object.keys(selectedStates).length / statesPerPage);

        document.getElementById('firstPageBtn').disabled = currentPage === 1;
        document.getElementById('prevPageBtn').disabled = currentPage === 1;
        document.getElementById('nextPageBtn').disabled = currentPage === totalPages;
        document.getElementById('lastPageBtn').disabled = currentPage === totalPages;

        document.getElementById('currentPage').textContent = currentPage;
    }

    document.getElementById('firstPageBtn').addEventListener('click', () => {
        currentPage = 1;
        updatePagination();
        renderTable();
    });

    document.getElementById('prevPageBtn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updatePagination();
            renderTable();
        }
    });

    document.getElementById('nextPageBtn').addEventListener('click', () => {
        const totalPages = Math.ceil(Object.keys(selectedStates).length / statesPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updatePagination();
            renderTable();
        }
    });

    document.getElementById('lastPageBtn').addEventListener('click', () => {
        currentPage = Math.ceil(Object.keys(selectedStates).length / statesPerPage);
        updatePagination();
        renderTable();
    });

    // Render the table with dynamically populated date columns and corresponding state data
    function renderTable() {
        tableBody.innerHTML = ''; // Clear previous table content
        tableHead.innerHTML = ''; // Clear previous date column headers

        // Create the state header
        const stateHeader = document.createElement('th');
        stateHeader.textContent = 'State';
        tableHead.appendChild(stateHeader);

        // If no dates are selected, don't render any date columns
        if (selectedSvsDates.length === 0) {
            if (debug) console.log('No dates selected, table will not render dates.');
            return;  // Exit early if no dates are selected
        }

        // Populate the date columns dynamically based on the selected dates, latest date on the right
        selectedSvsDates.slice().reverse().forEach(date => {
            const th = document.createElement('th');
            th.textContent = date;  // Set the date as the column title
            th.classList.add(`date-${date}`);
            tableHead.appendChild(th);  // Add the date header to the table
            if (debug) console.log('Rendering date column:', date);
        });

        const states = Object.keys(selectedStates).filter(state => selectedStates[state]);

        states.forEach(state => {
            const stateData = svsData[state];
            const row = document.createElement('tr');

            // Add state column (locked in place)
            const stateCell = document.createElement('th');
            stateCell.textContent = `State ${state}`;
            row.appendChild(stateCell);

            // Add date columns with prep, castle, and opposition results or "no-data" if not available
            selectedSvsDates.slice().reverse().forEach(date => {
                const dateCell = document.createElement('td');
                const details = stateData && stateData[date] ? stateData[date] : null;

                if (!details) {
                    // No data available for this state and date
                    dateCell.innerHTML = '<div class="no-data">No Data</div>';
                } else if (!details['had-svs-match']) {
                    // "No Match" case where "had-svs-match" is false
                    dateCell.innerHTML = '<div class="no-match">No Match</div>';
                } else {
                    // Display prep, castle, and opposition data
                    dateCell.innerHTML = `
                        <div class="prep ${details['won-prep'] === 'no-data' ? '' : details['won-prep'] ? 'highlight-yes' : 'highlight-no'}">Prep: ${details['won-prep'] === 'no-data' ? 'no-data' : details['won-prep'] ? 'Yes' : 'No'}</div>
                        <div class="castle ${details['won-castle'] === 'no-data' ? '' : details['won-castle'] ? 'highlight-yes' : 'highlight-no'}">Castle: ${details['won-castle'] === 'no-data' ? 'no-data' : details['won-castle'] ? 'Yes' : 'No'}</div>
                        <div class="opposition">Opposition: ${details['opposition-state'] === 'no-data' ? 'no-data' : details['opposition-state']}</div>
                    `;
                }
                dateCell.classList.add(`date-${date}`);
                row.appendChild(dateCell);
            });

            tableBody.appendChild(row);
        });

        updatePagination();

        if (debug) console.log('Table rendered with states:', selectedStates, 'and dates:', selectedSvsDates);
    }

    // Filters for Prep, Castle, and Match
    prepFilter.addEventListener('change', renderTable);
    castleFilter.addEventListener('change', renderTable);
    matchFilter.addEventListener('change', renderTable);

    // Get data source URL from config
    async function getDataSourceUrl() {
        const configResponse = await fetch('/config.json');
        const config = await configResponse.json();
        return config.dataSources.svs.url;
    }

    // Fetch the JSON data and initialize
    getDataSourceUrl()
        .then(dataUrl => {
            if (debug) console.log('Using data source URL:', dataUrl);
            return fetch(dataUrl);
        })
        .then(response => response.json())
        .then(data => {
            if (debug) console.log('JSON data loaded:', data);
            svsData = data["svs-data-per-state"];
            collectAllSvsDates();  // Collect all SVS dates from all states
            populateStateSelect();  // Populate the state select box with full state range
            populateDateSelect();   // Populate the date select box
            selectDefaultDates();   // Select the last 5 dates by default and reflect in UI
            selectDefaultStates();  // Select the first 10 states by default
            updatePagination();
            renderTable();  // ** Ensure table is rendered on page load **
        })
        .catch(error => console.error('Error loading JSON data:', error));
});

