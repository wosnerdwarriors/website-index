// Debugging flag and godmode flag
let debugMode = false;
let godMode = false;

// Store data.json content
let researchData = {};

// Object to store the user's current research state (mirrors researchData)
let userResearchState = {
	Growth: {},
	Economy: {},
	Battle: {}
};

// Function to check for ?debug=true or ?godmode=true in URL
function checkFlags() {
	const urlParams = new URLSearchParams(window.location.search);
	debugMode = urlParams.has('debug') && urlParams.get('debug') === 'true';
	godMode = urlParams.has('godmode') && urlParams.get('godmode') === 'true';

	if (debugMode) {
		console.log('Debug mode enabled');
	}
	if (godMode) {
		console.log('God mode enabled - requirements will be ignored');
	}
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

// Function to check if requirements for upgrading are met
function requirementsMet(researchIDToCheckIfWeCanUpgrade, researchTreeType, targetLevelForUpgrade) {
	let canUpgrade = true; // Assume we can upgrade unless proven otherwise
	const researchItemToUpgrade = researchData[researchTreeType][researchIDToCheckIfWeCanUpgrade];
	const requirementsForNextLevel = researchItemToUpgrade.levels[targetLevelForUpgrade]?.requirements?.['research-items'];

	// Log the research ID and level we're checking for upgrade
	if (debugMode) {
		console.log(`Checking if we can upgrade research ID: ${researchIDToCheckIfWeCanUpgrade} to level ${targetLevelForUpgrade}`);
	}

	if (requirementsForNextLevel) {
		// Loop through each required research and check if the level is met
		for (const [requiredResearchID, requiredResearchLevel] of Object.entries(requirementsForNextLevel)) {
			const currentLevelOfRequiredResearch = userResearchState[researchTreeType][requiredResearchID] || 0;
			
			// Log requirement status: current level vs required level
			if (debugMode) {
				console.log(`${researchIDToCheckIfWeCanUpgrade} to level ${targetLevelForUpgrade} Requirement: ${requiredResearchID} has level ${currentLevelOfRequiredResearch}/${requiredResearchLevel}`);
			}

			// If the actual level is less than the required level, mark as unmet
			if (currentLevelOfRequiredResearch < requiredResearchLevel) {
				canUpgrade = false;
				if (debugMode) {
					console.log(`${researchIDToCheckIfWeCanUpgrade} to level ${targetLevelForUpgrade} Requirement NOT met: ${requiredResearchID} requires level ${requiredResearchLevel}, but it is level ${currentLevelOfRequiredResearch}`);
				}
			} else if (debugMode) {
				console.log(`${researchIDToCheckIfWeCanUpgrade} to level ${targetLevelForUpgrade} Requirement met: ${requiredResearchID} requires level ${requiredResearchLevel}, and it is level ${currentLevelOfRequiredResearch}`);
			}
		}
	}

	// At the end, if godMode is enabled, bypass the requirements
	if (godMode) {
		if (debugMode) {
			console.log(`God mode enabled, ignoring requirements for research ID: ${researchIDToCheckIfWeCanUpgrade}`);
		}
		return true;
	}

	// Return whether the upgrade is allowed based on requirements
	return canUpgrade;
}

function getResourceAndTimeHTML(resourceCosts, researchTime, researchSpeed) {
	return `
		<div class="resource-costs">
			<div class="resource-item">
				<div class="resource-item-left"><img src="https://data.wosnerds.com/images/items/meat-ico.png" alt="Meat Icon"> Meat</div>
				<div class="resource-item-right">${formatResource(resourceCosts.meat || 0)}</div>
			</div>
			<div class="resource-item">
				<div class="resource-item-left"><img src="https://data.wosnerds.com/images/items/wood-ico.png" alt="Wood Icon"> Wood</div>
				<div class="resource-item-right">${formatResource(resourceCosts.wood || 0)}</div>
			</div>
			<div class="resource-item">
				<div class="resource-item-left"><img src="https://data.wosnerds.com/images/items/coal-ico.png" alt="Coal Icon"> Coal</div>
				<div class="resource-item-right">${formatResource(resourceCosts.coal || 0)}</div>
			</div>
			<div class="resource-item">
				<div class="resource-item-left"><img src="https://data.wosnerds.com/images/items/iron-ico.png" alt="Iron Icon"> Iron</div>
				<div class="resource-item-right">${formatResource(resourceCosts.iron || 0)}</div>
			</div>
			<div class="resource-item">
				<div class="resource-item-left"><img src="https://data.wosnerds.com/images/items/steel-ico.png" alt="Steel Icon"> Steel</div>
				<div class="resource-item-right">${formatResource(resourceCosts.steel || 0)}</div>
			</div>
			<div class="resource-item">
				<div class="resource-item-left"><img src="https://data.wosnerds.com/images/items/fc-ico.png" alt="FC Icon"> FC</div>
				<div class="resource-item-right">${formatResource(resourceCosts.fc || 0)}</div>
			</div>
		</div>
		<div class="time-required">
			<div class="resource-item">
				<div class="resource-item-left">Research Time</div>
				<div class="resource-item-right">${formatTime(researchTime)}</div>
			</div>
			<div class="resource-item">
				<div class="resource-item-left">Research Time (50%)</div>
				<div class="resource-item-right">${formatTime(researchTime / 2)}</div>
			</div>
		</div>
	`;
}


// Utility function to format resources with commas
function formatResource(amount) {
	return amount.toLocaleString();
}

// Function to format time for both regular and 50% times
function formatTime(seconds) {
	const timeUnits = [
		{ label: 'year', value: 60 * 60 * 24 * 365 },
		{ label: 'month', value: 60 * 60 * 24 * 30 },
		{ label: 'week', value: 60 * 60 * 24 * 7 },
		{ label: 'day', value: 60 * 60 * 24 },
		{ label: 'hour', value: 60 * 60 },
		{ label: 'minute', value: 60 },
	];

	let timeStr = '';
	for (const unit of timeUnits) {
		if (seconds >= unit.value) {
			const count = Math.floor(seconds / unit.value);
			timeStr += `${count} ${unit.label}${count > 1 ? 's' : ''} `;
			seconds %= unit.value;
		}
	}

	return timeStr.trim();
}

// Function to render the research tree dynamically
// Function to render the research tree dynamically
function renderResearchTree(researchTreeData, researchTreeType) {
	const researchTable = document.getElementById('researchTable');
	if (!researchTable) {
		console.error(`Table with ID "researchTable" not found!`);
		return;
	}

	// Clear existing table content
	researchTable.innerHTML = '';

	// Organize research items by row
	const researchRows = {};
	Object.keys(researchTreeData).forEach((researchID) => {
		const researchItem = researchTreeData[researchID];
		if (!researchRows[researchItem.row]) {
			researchRows[researchItem.row] = [];
		}
		researchRows[researchItem.row].push({ researchID, ...researchItem });
	});

	// Iterate through rows to render them
	Object.keys(researchRows).forEach(rowNumber => {
		const researchItemsInRow = researchRows[rowNumber];
		const rowElement = document.createElement('tr');
		const emptyCell = '<td></td>'; // Placeholder for empty cells

		// Handle cases based on the number of research items in a row
		if (researchItemsInRow.length === 1) {
			rowElement.innerHTML = `${emptyCell}
				${generateResearchItemCell(researchItemsInRow[0], researchTreeType)}
				${emptyCell}`;
		} else if (researchItemsInRow.length === 2) {
			rowElement.innerHTML = `
				${generateResearchItemCell(researchItemsInRow[0], researchTreeType)}
				${emptyCell}
				${generateResearchItemCell(researchItemsInRow[1], researchTreeType)}
			`;
		} else if (researchItemsInRow.length === 3) {
			rowElement.innerHTML = `
				${generateResearchItemCell(researchItemsInRow[0], researchTreeType)}
				${generateResearchItemCell(researchItemsInRow[1], researchTreeType)}
				${generateResearchItemCell(researchItemsInRow[2], researchTreeType)}
			`;
		}else{
			console.log("CRITICAL ERROR, a data row has more than 3 research items in a single row. we won't be displaying the row at all")
		}

		researchTable.appendChild(rowElement);

		// Attach event listeners after row has been added to the DOM
		researchItemsInRow.forEach(researchItem => {
			let currentResearchLevel = userResearchState[researchTreeType][researchItem.researchID];
			const maxResearchLevel = Object.keys(researchItem.levels).length;

			// Add event listener to increase button
			const increaseButton = document.getElementById(`increase-${researchTreeType}-${researchItem.researchID}`);
			if (increaseButton) {
				// Check requirements for the next level (i.e., currentResearchLevel + 1)
				const nextLevel = currentResearchLevel + 1;
				const requirementsCheck = requirementsMet(researchItem.researchID, researchTreeType, nextLevel);

				if (!requirementsCheck) {
					// Grey out the button if requirements aren't met
					increaseButton.disabled = true;
					increaseButton.classList.add('btn-secondary');
					increaseButton.classList.remove('btn-primary');
				}

				// Add click event listener to handle upgrades
				increaseButton.addEventListener('click', () => {
					// Re-check if the requirements are met when trying to upgrade
					const canUpgrade = requirementsMet(researchItem.researchID, researchTreeType, nextLevel);

					if (currentResearchLevel < maxResearchLevel && (canUpgrade || godMode)) {
						currentResearchLevel++; // Increment the level
						userResearchState[researchTreeType][researchItem.researchID] = currentResearchLevel; // Update the state
						document.getElementById(`level-${researchTreeType}-${researchItem.researchID}`).textContent = currentResearchLevel; // Update the UI

						// Debugging: log upgrade success
						if (debugMode) {
							console.log(`Increased level for ${researchItem.researchID} to ${currentResearchLevel}`);
							if (!canUpgrade) {
								console.log(`God mode bypassed requirements for ${researchItem.researchID}`);
							}
						}
					} else if (debugMode) {
						console.log(`Cannot upgrade ${researchItem.researchID} due to unmet requirements or max level reached.`);
					}
					renderResearchTree(researchTreeData, researchTreeType); // Re-render tree after upgrading
				});
			}

			// Add event listener to decrease button
			const decreaseButton = document.getElementById(`decrease-${researchTreeType}-${researchItem.researchID}`);
			if (decreaseButton) {
				decreaseButton.addEventListener('click', () => {
					if (currentResearchLevel > 0) {
						currentResearchLevel--; // Decrement the level
						userResearchState[researchTreeType][researchItem.researchID] = currentResearchLevel; // Update the state
						document.getElementById(`level-${researchTreeType}-${researchItem.researchID}`).textContent = currentResearchLevel; // Update the UI
						if (debugMode) {
							console.log(`Decreased level for ${researchItem.researchID} to ${currentResearchLevel}`);
						}
						renderResearchTree(researchTreeData, researchTreeType); // Re-render tree after downgrading
					}
				});
			}
		});
	});

	// Show/hide table borders based on debug mode
	if (debugMode) {
		researchTable.classList.add('table-bordered');  // Show table borders in debug mode
	} else {
		researchTable.classList.remove('table-bordered');  // Hide table borders in non-debug mode
	}
}


function generateResearchItemCell(researchItem, researchTreeType) {
	const currentLevel = userResearchState[researchTreeType][researchItem.researchID];
	const nextLevel = currentLevel + 1;
	const nextLevelData = researchItem.levels[nextLevel] || {};  // Get next level data or an empty object

	return `
		<td>
			<div class="d-flex justify-content-between" style="height: 100%;">
				<!-- Left Side: Research Info -->
				<div class="left-side" style="width: 50%; padding-right: 10px;">
					<div class="research-square"></div>
					<div class="research-item-name">${researchItem.name}</div>
					<div class="research-item-level">Level: <span id="level-${researchTreeType}-${researchItem.researchID}">${currentLevel}</span>/${Object.keys(researchItem.levels).length}</div>
					<div class="button-group">
						<button id="decrease-${researchTreeType}-${researchItem.researchID}" class="btn btn-primary btn-sm square-btn">-</button>
						<button id="increase-${researchTreeType}-${researchItem.researchID}" class="btn btn-primary btn-sm square-btn">+</button>
					</div>
				</div>

				<!-- Right Side: Resource Costs and Time -->
				<div class="right-side" style="width: 50%; padding-left: 10px;">
					${getResourceAndTimeHTML(nextLevelData.cost || {}, nextLevelData['research-time'] || 0, 0)}
				</div>
			</div>
		</td>
	`;
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
	checkFlags(); // Check if debug or god mode is enabled

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
// Function to handle tab switching
function handleTabSwitch(selectedTabId) {
	const researchTabs = document.querySelectorAll('.btn-outline-primary');
	
	// Remove 'active' class from all buttons
	researchTabs.forEach(tab => {
		tab.classList.remove('active');
	});

	// Add 'active' class to the clicked button
	const selectedButton = document.getElementById(selectedTabId);
	selectedButton.classList.add('active');

	// Render the appropriate tree based on the selected tab
	if (selectedTabId === 'growth-tab') {
		renderResearchTree(researchData.Growth, 'Growth');
	} else if (selectedTabId === 'economy-tab') {
		renderResearchTree(researchData.Economy, 'Economy');
	} else if (selectedTabId === 'battle-tab') {
		renderResearchTree(researchData.Battle, 'Battle');
	}

	if (debugMode) {
		console.log(`Switched to ${selectedTabId}`);
	}
}

// Attach event listeners for tab switching
document.addEventListener('DOMContentLoaded', function () {
	checkFlags(); // Check if debug or god mode is enabled

	// Initial load of data.json
	loadResearchData();

	// Event listeners for tab switching
	const researchTabs = document.querySelectorAll('.btn-outline-primary');
	researchTabs.forEach(tab => {
		tab.addEventListener('click', function (event) {
			const selectedTabId = event.target.getAttribute('id');
			handleTabSwitch(selectedTabId);
		});
	});
});
