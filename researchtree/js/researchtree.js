// Debugging flag
let debugMode = false;

// Store data.json content
let researchData = {};

// Object to store the user's current research state (mirrors researchData)
let userResearchState = {
	Growth: {},
	Economy: {},
	Battle: {}
};

// Function to check for ?debug=true in URL
function isDebugMode() {
	const urlParams = new URLSearchParams(window.location.search);
	debugMode = urlParams.has('debug') && urlParams.get('debug') === 'true';
	if (debugMode) {
		console.log('Debug mode enabled');
	}
	return debugMode;
}

// Initialize userResearchState based on researchData structure
function initializeUserResearchState() {
	['Growth', 'Economy', 'Battle'].forEach(treeType => {
		if (researchData[treeType]) {
			Object.keys(researchData[treeType]).forEach(itemKey => {
				// Set initial level to 0 for each research item
				userResearchState[treeType][itemKey] = 0; 
			});
		}
	});
	if (debugMode) {
		console.log('Initialized userResearchState:', userResearchState);
	}
}

// Function to render the research tree dynamically
function renderResearchTree(treeData, treeType) {
	const table = document.getElementById('researchTable');
	if (!table) {
		console.error(`Table with ID "researchTable" not found!`);
		return;
	}

	// Clear existing table content
	table.innerHTML = '';

	// Sort research items by row
	const rows = {};
	Object.keys(treeData).forEach((key) => {
		const item = treeData[key];
		if (!rows[item.row]) {
			rows[item.row] = [];
		}
		rows[item.row].push({ key, ...item });
	});

	// Iterate through rows to render them
	Object.keys(rows).forEach(rowKey => {
		const items = rows[rowKey];
		const rowElement = document.createElement('tr');
		const emptyCell = '<td></td>'; // Placeholder for empty cells

		// Ensure the row has exactly 3 columns
		if (items.length === 1) {
			rowElement.innerHTML = `${emptyCell}
				<td>
					<div class="research-square"></div>
					<div>${items[0].name}</div>
					<div>Level: <span id="level-${treeType}-${items[0].key}">${userResearchState[treeType][items[0].key]}</span>/${Object.keys(items[0].levels).length}</div>
					<div>
						<button id="decrease-${treeType}-${items[0].key}" class="btn btn-primary">-</button>
						<button id="increase-${treeType}-${items[0].key}" class="btn btn-primary">+</button>
					</div>
				</td>
				${emptyCell}`;
		} else if (items.length === 2) {
			rowElement.innerHTML = `
				<td>
					<div class="research-square"></div>
					<div>${items[0].name}</div>
					<div>Level: <span id="level-${treeType}-${items[0].key}">${userResearchState[treeType][items[0].key]}</span>/${Object.keys(items[0].levels).length}</div>
					<div>
						<button id="decrease-${treeType}-${items[0].key}" class="btn btn-primary">-</button>
						<button id="increase-${treeType}-${items[0].key}" class="btn btn-primary">+</button>
					</div>
				</td>
				${emptyCell}
				<td>
					<div class="research-square"></div>
					<div>${items[1].name}</div>
					<div>Level: <span id="level-${treeType}-${items[1].key}">${userResearchState[treeType][items[1].key]}</span>/${Object.keys(items[1].levels).length}</div>
					<div>
						<button id="decrease-${treeType}-${items[1].key}" class="btn btn-primary">-</button>
						<button id="increase-${treeType}-${items[1].key}" class="btn btn-primary">+</button>
					</div>
				</td>`;
		} else {
			items.forEach(item => {
				const cell = document.createElement('td');
				cell.innerHTML = `
					<div class="research-square"></div>
					<div>${item.name}</div>
					<div>Level: <span id="level-${treeType}-${item.key}">${userResearchState[treeType][item.key]}</span>/${Object.keys(item.levels).length}</div>
					<div>
						<button id="decrease-${treeType}-${item.key}" class="btn btn-primary">-</button>
						<button id="increase-${treeType}-${item.key}" class="btn btn-primary">+</button>
					</div>
				`;
				rowElement.appendChild(cell);
			});
		}

		table.appendChild(rowElement);

		// Attach event listeners after row has been added to the DOM
		items.forEach(item => {
			let currentLevel = userResearchState[treeType][item.key];
			const maxLevel = Object.keys(item.levels).length;

			// Add event listener to increase button
			document.getElementById(`increase-${treeType}-${item.key}`).addEventListener('click', () => {
				if (currentLevel < maxLevel) {
					currentLevel++; // Increment the level
					userResearchState[treeType][item.key] = currentLevel; // Update the state
					document.getElementById(`level-${treeType}-${item.key}`).textContent = currentLevel; // Update the UI
					if (debugMode) {
						console.log(`Increased level for ${item.key} to ${currentLevel}`);
					}
				}
			});

			// Add event listener to decrease button
			document.getElementById(`decrease-${treeType}-${item.key}`).addEventListener('click', () => {
				if (currentLevel > 0) {
					currentLevel--; // Decrement the level
					userResearchState[treeType][item.key] = currentLevel; // Update the state
					document.getElementById(`level-${treeType}-${item.key}`).textContent = currentLevel; // Update the UI
					if (debugMode) {
						console.log(`Decreased level for ${item.key} to ${currentLevel}`);
					}
				}
			});
		});
	});

	// Show/hide table borders based on debug mode
	if (debugMode) {
	   table.classList.add('table-bordered');
	   table.classList.remove('table-borderless');
	} else {
       table.classList.add('table-borderless');
       table.classList.remove('table-bordered');
	}
}


// Function to load research data from data.json (only done once on page load)
function loadResearchData() {
	if (debugMode) {
		console.log('Attempting to load research data from /researchtree/data.json');
	}

	fetch('/researchtree/data.json')
		.then(response => {
			if (!response.ok) {
				console.error(`Failed to load JSON data. Status: ${response.status}`);
				throw new Error(`HTTP status code: ${response.status}`);
			}
			if (debugMode) {
				console.log('Successfully fetched JSON data');
			}
			return response.json();
		})
		.then(data => {
			researchData = data; // Store the loaded data
			initializeUserResearchState(); // Initialize user research state based on the data
			if (debugMode) {
				console.log('Research data loaded:', researchData);
			}
			// Render the Growth tree by default
			renderResearchTree(researchData.Growth, 'Growth');
		})
		.catch(error => {
			console.error('Error loading research data:', error);
		});
}

// Load the navbar from an external file
$(function () {
	$('#navbar').load('/navbar.html', function () {
		if (debugMode) {
			console.log('Navbar loaded from /navbar.html');
		}
	});
});

// Handle tab switching and load the appropriate research tree
document.addEventListener('DOMContentLoaded', function () {
	if (isDebugMode()) {
		console.log('DOMContentLoaded event triggered');
	}

	// Initial load of data.json
	loadResearchData();

	// Event listeners for tab switching
	const researchTabs = document.querySelectorAll('#researchTabs .nav-link');

	researchTabs.forEach(tab => {
		tab.addEventListener('click', function (event) {
			// Get the ID of the selected tab
			const selectedTabId = event.target.getAttribute('id');

			// Clear existing table content
			document.getElementById('researchTable').innerHTML = '';

			// Load the appropriate research tree based on the selected tab
			if (selectedTabId === 'growth-tab') {
				renderResearchTree(researchData.Growth, 'Growth');
			} else if (selectedTabId === 'economy-tab') {
				renderResearchTree(researchData.Economy, 'Economy');
			} else if (selectedTabId === 'battle-tab') {
				renderResearchTree(researchData.Battle, 'Battle');
			}

			// Debugging: Log the tab switching
			if (debugMode) {
				console.log(`Switched to ${selectedTabId}`);
			}
		});
	});
});

// Handle tab switching and load the appropriate research tree
document.addEventListener('DOMContentLoaded', function () {
	if (isDebugMode()) {
		console.log('DOMContentLoaded event triggered');
	}

	// Initial load of data.json
	loadResearchData();

	// Event listeners for tab switching
	const researchTabs = document.querySelectorAll('.btn');
	const researchTable = document.getElementById('researchTable');

	researchTabs.forEach(tab => {
		tab.addEventListener('click', function (event) {
			// Remove active class from all tabs
			researchTabs.forEach(btn => btn.classList.remove('active', 'btn-primary'));
			// Set the clicked tab as active
			this.classList.add('active', 'btn-primary');

			// Get the ID of the selected tab
			const selectedTabId = event.target.getAttribute('id');

			// Clear existing table content
			researchTable.innerHTML = '';

			// Load the appropriate research tree based on the selected tab
			if (selectedTabId === 'growth-tab') {
				renderResearchTree(researchData.Growth, 'Growth');
			} else if (selectedTabId === 'economy-tab') {
				renderResearchTree(researchData.Economy, 'Economy');
			} else if (selectedTabId === 'battle-tab') {
				renderResearchTree(researchData.Battle, 'Battle');
			}

			// Debugging: Log the tab switching
			if (debugMode) {
				console.log(`Switched to ${selectedTabId}`);
			}
		});
	});
});