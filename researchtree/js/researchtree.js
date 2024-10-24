
// Debugging flag and godmode flag
let debugMode = false;
let godMode = false;
let allowRecursiveUpgradeWanted = false; // Default: allow recursive upgrades in 'wanted' mode


let currentTreeType = 'Growth'; // Default to Growth on initial load

// Store data.json content
let researchConfigData = {};


let currentMode = 'wanted'; // Default to 'wanted' research mode
let existingResearchState = {
	Growth: {},
	Economy: {},
	Battle: {}
};
let wantedResearchState = {
	Growth: {},
	Economy: {},
	Battle: {}
};

let currentWantedOrExistingResearchState = wantedResearchState;

// Function to attach event handlers to research items
function attachEventHandlersToResearchItems(researchItemsInRow, researchTreeType) {
	researchItemsInRow.forEach(researchItem => {
		let currentResearchLevel = currentWantedOrExistingResearchState[researchTreeType][researchItem.researchID];
		const maxResearchLevel = researchItem.levels ? Object.keys(researchItem.levels).length : 0;
		const existingResearchLevel = existingResearchState[researchTreeType][researchItem.researchID] || 0;

		// Add event listener to increase button
		const increaseButton = document.getElementById(`increase-${researchTreeType}-${researchItem.researchID}`);
		if (increaseButton) {
			const nextLevel = currentResearchLevel + 1;
			const requirementsCheck = requirementsMet(researchItem.researchID, researchTreeType, nextLevel);

			// Enable/Disable button based on the recursive upgrade toggle and max level check
			if (allowRecursiveUpgradeWanted || (requirementsCheck && currentResearchLevel < maxResearchLevel)) {
				increaseButton.disabled = false;
				increaseButton.classList.remove('btn-secondary');
				increaseButton.classList.add('btn-primary');
			} else {
				increaseButton.disabled = true;
				increaseButton.classList.add('btn-secondary');
				increaseButton.classList.remove('btn-primary');
			}

			// Add click event listener to handle upgrades
			increaseButton.addEventListener('click', () => {
				if (currentResearchLevel < maxResearchLevel) {
					// Apply recursive upgrade logic if the toggle is enabled
					if (allowRecursiveUpgradeWanted) {
						recursiveUpgrade(researchItem.researchID, researchTreeType, nextLevel);
					} else {
						// Regular upgrade logic
						if (requirementsMet(researchItem.researchID, researchTreeType, nextLevel)) {
							currentResearchLevel++;
							currentWantedOrExistingResearchState[researchTreeType][researchItem.researchID] = currentResearchLevel;
							document.getElementById(`level-${researchTreeType}-${researchItem.researchID}`).textContent = currentResearchLevel;
						}
					}

					// Re-render the research tree after the upgrade
					renderResearchTree();
				}
			});
		}

		// Add event listener to decrease button
		const decreaseButton = document.getElementById(`decrease-${researchTreeType}-${researchItem.researchID}`);
		if (decreaseButton) {
			// Disable the button if the current level is <= existing level
			if (currentResearchLevel <= existingResearchLevel) {
				decreaseButton.disabled = true;
				decreaseButton.classList.add('btn-secondary');
				decreaseButton.classList.remove('btn-primary');
			} else {
				decreaseButton.disabled = false;
				decreaseButton.classList.remove('btn-secondary');
				decreaseButton.classList.add('btn-primary');
			}

			// Add click event listener to handle downgrades
			decreaseButton.addEventListener('click', () => {
				if (currentResearchLevel > 0 && currentResearchLevel > existingResearchLevel) {
					if (!isBlockedFromDowngrade(researchItem.researchID, researchTreeType)) {
						currentResearchLevel--;
						currentWantedOrExistingResearchState[researchTreeType][researchItem.researchID] = currentResearchLevel;
						document.getElementById(`level-${researchTreeType}-${researchItem.researchID}`).textContent = currentResearchLevel;
					}
					renderResearchTree();
				}
			});
		}
	});
}


function getWhichWantedOrExistingModeIsActive()
{
	if (currentWantedOrExistingResearchState === existingResearchState) {
	    return "existingResearchState";
	} else if (currentWantedOrExistingResearchState === wantedResearchState) {
	    return "wantedResearchState";
	} else {
	    return "unknown";
	}
}

// Function to update the research info bar with total resources and time for all trees
function updateTotalResourcesAndTime() {
	if (debugMode) {
		console.log("running updateTotalResourcesAndTime");
		console.log("wantedResearchState is:", wantedResearchState);
		console.log("current mode is:", getWhichWantedOrExistingModeIsActive());
	}

let currentWantedOrExistingResearchState = existingResearchState;
	let totalResources = {
		meat: 0,
		wood: 0,
		coal: 0,
		iron: 0,
		steel: 0,
		fc: 0
	};

	let totalResearchTime = 0;
	let reducedResearchTime = 0;
	const researchSpeed = getResearchSpeed();  // Retrieve research speed as a decimal (e.g., 0.8 for 80%)


	// Calculate total resources and total research time for all research trees
	['Growth', 'Economy', 'Battle'].forEach(treeType => {
		Object.keys(wantedResearchState[treeType]).forEach(researchID => {
			const wantedLevel = wantedResearchState[treeType][researchID];
			const existingLevel = existingResearchState[treeType][researchID] || 0;
			const researchItem = researchConfigData[treeType][researchID];

			// Only calculate the difference between wanted and existing levels
			for (let level = existingLevel + 1; level <= wantedLevel; level++) {
				const levelData = researchItem.levels[level];

				if (levelData) {
					const cost = levelData.cost || {};
					totalResources.meat += cost.meat || 0;
					totalResources.wood += cost.wood || 0;
					totalResources.coal += cost.coal || 0;
					totalResources.iron += cost.iron || 0;
					totalResources.steel += cost.steel || 0;
					totalResources.fc += cost.fc || 0;

					// Calculate research time for this level
					const researchTime = levelData['research-time-seconds'] || 0;
					totalResearchTime += researchTime;
				}
			}
		});
	});

	// Apply research speed reduction
	reducedResearchTime = totalResearchTime / (1 + researchSpeed);

	// Generate HTML using the getResourceAndTimeHTML function
	const htmlContent = getResourceAndTimeHTML(totalResources, totalResearchTime, researchSpeed);

	// Inject the generated HTML into the info bar
	const costBlock = document.getElementById('research-total-cost-block');

	costBlock.innerHTML = `
		<h4>Total Research Resources & Time</h4>
		${htmlContent}
	`;
}
// Function to generate HTML for total stats
function generateTotalStatsHTML(stats, title) {
	let htmlContent = `<h4>${title}</h4><div class="stat-section">`;
	Object.keys(stats).forEach(statName => {
		htmlContent += `
			<div class="stat-item">
				<div class="stat-label">${statName}</div>
				<div class="stat-value">+${stats[statName].toFixed(2)}%</div>
			</div>`;
	});
	htmlContent += '</div>';
	return htmlContent;
}


// Updated renderResearchTree function
function renderResearchTree() {
	const researchTable = document.getElementById('researchTable');
	if (!researchTable) {
		console.error(`Table with ID "researchTable" not found!`);
		return;
	}

	if (debugMode) {
		console.log(`renderResearchTree for currentTreeType: `, currentTreeType);
		updateDebugTable();
	}

	updateTotalResourcesAndTime();
	updateTotalStats();
	researchTable.innerHTML = '';

	const researchRows = {};
	Object.keys(researchConfigData[currentTreeType]).forEach(researchID => {
		const researchItem = researchConfigData[currentTreeType][researchID];
		if (!researchRows[researchItem.row]) {
			researchRows[researchItem.row] = [];
		}
		researchRows[researchItem.row].push({ researchID, ...researchItem });
	});

	Object.keys(researchRows).forEach(rowNumber => {
		const researchItemsInRow = researchRows[rowNumber];
		const rowElement = document.createElement('tr');
		const emptyCell = '<td></td>';

		if (researchItemsInRow.length === 1) {
			rowElement.innerHTML = `${emptyCell}
				${generateResearchItemCell(researchItemsInRow[0], currentTreeType)}
				${emptyCell}`;
		} else if (researchItemsInRow.length === 2) {
			rowElement.innerHTML = `
				${generateResearchItemCell(researchItemsInRow[0], currentTreeType)}
				${emptyCell}
				${generateResearchItemCell(researchItemsInRow[1], currentTreeType)}
			`;
		} else if (researchItemsInRow.length === 3) {
			rowElement.innerHTML = `
				${generateResearchItemCell(researchItemsInRow[0], currentTreeType)}
				${generateResearchItemCell(researchItemsInRow[1], currentTreeType)}
				${generateResearchItemCell(researchItemsInRow[2], currentTreeType)}
			`;
		} else {
			console.log(`CRITICAL ERROR: A data row has more than 3 research items (${researchItemsInRow.length}). We won't be displaying the row at all.`);
		}

		researchTable.appendChild(rowElement);

		// Attach event handlers for buttons
		attachEventHandlersToResearchItems(researchItemsInRow, currentTreeType);
	});

	if (debugMode) {
		researchTable.classList.add('table-bordered');
	} else {
		researchTable.classList.remove('table-bordered');
	}
}

function generateResearchItemCell(researchItem, researchTreeType) {
    const currentLevel = currentWantedOrExistingResearchState[researchTreeType][researchItem.researchID];
    const maxLevel = researchItem.levels ? Object.keys(researchItem.levels).length : 0;
    const nextLevel = currentLevel + 1;

    const nextLevelData = researchItem.levels && researchItem.levels[nextLevel] ? researchItem.levels[nextLevel] : {};
    const isMaxed = nextLevel > maxLevel;

    const researchSpeed = getResearchSpeed();
    const stat = researchItem.stat || "N/A";
    const statAddition = nextLevelData['stat-addition'] || 0;

    // Check which type of requirement to show
    const showResearchRequirements = document.getElementById('requirementsToggle').checked;
    const requirementsHTML = showResearchRequirements ? 
        getResearchRequirementsHTML(researchItem, researchTreeType, nextLevel) : 
        getResourceAndTimeHTML(nextLevelData.cost || {}, nextLevelData['research-time-seconds'] || 0, researchSpeed, isMaxed);

    return `
        <td>
            <div class="d-flex justify-content-between" style="height: 100%;">
                <!-- Left Side: Research Info -->
                <div class="left-side" style="width: 50%; padding-right: 10px;">
                    <div class="research-square"></div>
                    <div class="research-item-name">${researchItem.name}</div>
                    <div class="research-item-level">Level: <span id="level-${researchTreeType}-${researchItem.researchID}">${currentLevel}</span>/${maxLevel}</div>
                    <div class="button-group">
                        <button id="decrease-${researchTreeType}-${researchItem.researchID}" class="btn btn-primary btn-sm square-btn">-</button>
                        <button id="increase-${researchTreeType}-${researchItem.researchID}" class="btn btn-primary btn-sm square-btn">+</button>
                    </div>

                    <div class="stat-increase-info mt-3">
                        <div class="stat-item">
                            <div class="stat-label">${stat}</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">+${statAddition}%</div>
                        </div>
                    </div>
                </div>

                <!-- Right Side: Resource or Research/Building Requirements -->
                <div class="right-side" style="width: 50%; padding-left: 10px;">
                    ${requirementsHTML}
                </div>
            </div>
        </td>
    `;
}



function getResearchRequirementsHTML(researchItem, researchTreeType, targetLevel) {
    let htmlContent = '';

    // Retrieve research requirements for the specified level
    const researchRequirements = researchItem.levels[targetLevel]?.requirements?.['research-items'];
    const buildingRequirements = researchItem.levels[targetLevel]?.requirements?.['buildings'];

    if (researchRequirements) {
        htmlContent += '<div class="requirements-section"><b>Research:</b>';
        Object.entries(researchRequirements).forEach(([requiredResearchID, requiredLevel]) => {
            const currentLevel = currentWantedOrExistingResearchState[researchTreeType][requiredResearchID] || 0;
            const requirementMet = currentLevel >= requiredLevel;
            const requirementClass = requirementMet ? 'requirement-met' : 'requirement-not-met';

            const researchName = researchConfigData[researchTreeType][requiredResearchID].name || requiredResearchID;
            htmlContent += `
                <div class="requirement-item ${requirementClass}">
                    <span>${researchName}	lvl ${requiredLevel} </span>
                </div>`;
        });
        htmlContent += '</div>';
    }

    if (buildingRequirements) {
        htmlContent += '<div class="requirements-section"><b>Buildings:</b>';
        Object.entries(buildingRequirements).forEach(([requiredBuilding, requiredLevel]) => {
            //const requirementMet = currentBuildingLevel >= requiredLevel;
            //const requirementClass = requirementMet ? 'requirement-met' : 'requirement-not-met';
        	const requirementClass = 'requirement-met';
            
            htmlContent += `
                <div class="requirement-item ${requirementClass}">
                    <span>${requiredBuilding}	 lvl ${requiredLevel}</span>
                </div>`;
        });
        htmlContent += '</div>';
    }
    return htmlContent;
}


function getResourceAndTimeHTML(resourceCosts, researchTime, researchSpeed, isMaxed=false) {
	let formattedTime = '';
	let reducedResearchTime = '';
	if (!isMaxed) {
		reducedResearchTime = researchTime / (1 + researchSpeed);
		formattedTime = formatTime(researchTime);
	} else {
		formattedTime = 'MAXED';
	}

	return `
		<div class="resource-costs">
			<div class="resource-item">
				<div class="resource-item-left"><img src="https://data.wosnerds.com/images/items/meat-ico.png" alt="Meat Icon"> Meat</div>
				<div class="resource-item-right">${isMaxed ? 'MAXED' : formatResource(resourceCosts.meat || 0)}</div>
			</div>
			<div class="resource-item">
				<div class="resource-item-left"><img src="https://data.wosnerds.com/images/items/wood-ico.png" alt="Wood Icon"> Wood</div>
				<div class="resource-item-right">${isMaxed ? 'MAXED' : formatResource(resourceCosts.wood || 0)}</div>
			</div>
			<div class="resource-item">
				<div class="resource-item-left"><img src="https://data.wosnerds.com/images/items/coal-ico.png" alt="Coal Icon"> Coal</div>
				<div class="resource-item-right">${isMaxed ? 'MAXED' : formatResource(resourceCosts.coal || 0)}</div>
			</div>
			<div class="resource-item">
				<div class="resource-item-left"><img src="https://data.wosnerds.com/images/items/iron-ico.png" alt="Iron Icon"> Iron</div>
				<div class="resource-item-right">${isMaxed ? 'MAXED' : formatResource(resourceCosts.iron || 0)}</div>
			</div>
			<div class="resource-item">
				<div class="resource-item-left"><img src="https://data.wosnerds.com/images/items/steel-ico.png" alt="Steel Icon"> Steel</div>
				<div class="resource-item-right">${isMaxed ? 'MAXED' : formatResource(resourceCosts.steel || 0)}</div>
			</div>
			<!--
			<div class="resource-item">
				<div class="resource-item-left"><img src="https://data.wosnerds.com/images/items/fc-ico.png" alt="FC Icon"> FC</div>
				<div class="resource-item-right">${isMaxed ? 'MAXED' : formatResource(resourceCosts.fc || 0)}</div>
			</div>
			-->
		</div>
		<div class="time-required">
			<div class="resource-item-left">Time: ${formattedTime}</div>
			${!isMaxed ? `<div class="resource-item-left">Time (final): ${formatTime(reducedResearchTime)}</div>` : ''}
		</div>
	`;
}

function formatResource(amount) {
	return amount.toLocaleString();
}

function formatTime(seconds) {
	const timeUnits = [
		{ label: 'year', value: 60 * 60 * 24 * 365 },
		{ label: 'month', value: 60 * 60 * 24 * 30 },
		{ label: 'week', value: 60 * 60 * 24 * 7 },
		{ label: 'day', value: 60 * 60 * 24 },
		{ label: 'hour', value: 60 * 60 },
		{ label: 'minute', value: 60 },
		{ label: 'second', value: 1 },
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

function checkUrlGetParameters() {
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

function initializeResearchStates() {
	['Growth', 'Economy', 'Battle'].forEach(treeType => {
		if (researchConfigData[treeType]) {
			Object.keys(researchConfigData[treeType]).forEach(itemKey => {
				existingResearchState[treeType][itemKey] = existingResearchState[treeType][itemKey] || 0;
				wantedResearchState[treeType][itemKey] = wantedResearchState[treeType][itemKey] || 0;
			});
		}
	});
	if (debugMode) {
		console.log('Initialized both research states:', { existingResearchState, wantedResearchState });
	}
}

// Function to update the total stats and display two blocks
// Function to update the total stats and display two blocks
function updateTotalStats() {
	let existingTotalStats = {};
	let wantedMinusExistingStats = {};

	// Loop through all trees (Growth, Economy, Battle)
	['Growth', 'Economy', 'Battle'].forEach(treeType => {
		Object.keys(wantedResearchState[treeType]).forEach(researchID => {
			const wantedLevel = wantedResearchState[treeType][researchID];
			const existingLevel = existingResearchState[treeType][researchID] || 0;
			const researchItem = researchConfigData[treeType][researchID];

			// Calculate total stats from existing research
			for (let level = 1; level <= existingLevel; level++) {
				const levelData = researchItem.levels[level];
				if (levelData && levelData['stat-addition']) {
					Object.keys(levelData['stat-addition']).forEach(stat => {
						existingTotalStats[stat] = (existingTotalStats[stat] || 0) + levelData['stat-addition'][stat];
					});
				}
			}

			// Calculate the difference between wanted and existing research
			for (let level = existingLevel + 1; level <= wantedLevel; level++) {
				const levelData = researchItem.levels[level];
				if (levelData && levelData['stat-addition']) {
					Object.keys(levelData['stat-addition']).forEach(stat => {
						wantedMinusExistingStats[stat] = (wantedMinusExistingStats[stat] || 0) + levelData['stat-addition'][stat];
					});
				}
			}
		});
	});

	// Generate HTML for both blocks
	const existingStatsHTML = generateTotalStatsHTML(existingTotalStats, "Total Stats from Existing Research");
	const wantedMinusExistingStatsHTML = generateTotalStatsHTML(wantedMinusExistingStats, "Total Stats (Wanted - Existing)");

	// Inject the HTML into the research-total-stats-block
	const statsBlock = document.getElementById('research-total-stats-block');
	statsBlock.innerHTML = `
		<div class="total-stats">
			${existingStatsHTML}
			${wantedMinusExistingStatsHTML}
		</div>
	`;
}



function requirementsMet(researchID, researchTreeType, targetLevel) {
	if (currentMode === 'existing') return true;

	const researchItem = researchConfigData[researchTreeType][researchID];
	const requirements = researchItem.levels[targetLevel]?.requirements?.['research-items'];

	if (requirements) {
		for (const [reqID, reqLevel] of Object.entries(requirements)) {
			const currentLevel = currentWantedOrExistingResearchState[researchTreeType][reqID] || 0;
			if (currentLevel < reqLevel) {
				if (debugMode) {
					console.log(`Cannot upgrade ${researchID} to level ${targetLevel}. Requirement not met: ${reqID} (needs ${reqLevel}, current ${currentLevel})`);
				}
				return false;
			}
		}
	}
	return godMode || true;
}

function getResearchSpeed() {
	const researchSpeedInput = document.getElementById('researchSpeedInput');
	const speedValue = parseFloat(researchSpeedInput.value);
	return isNaN(speedValue) || speedValue < 0 ? 0 : speedValue / 100;
}

function loadresearchConfigData() {
	if (debugMode) console.log('Attempting to load research data json');

	fetch('https://data.wosnerds.com/data/research-upgrades.json')
		.then(response => response.ok ? response.json() : Promise.reject(`Failed with status ${response.status}`))
		.then(data => {
			researchConfigData = data;
			initializeResearchStates();
			if (debugMode) console.log('Research data loaded:', researchConfigData);
			renderResearchTree();
		})
		.catch(error => console.error('Error loading research data:', error));
}

function updateDebugTable() {
	const debugTable = document.getElementById('debug-research-table');
	if (debugMode) {
		debugTable.style.display = 'block';
		const debugTableBody = document.getElementById('debug-table-body');
		debugTableBody.innerHTML = '';
		Object.keys(researchConfigData[currentTreeType]).forEach(itemKey => {
			const existingLevel = existingResearchState[currentTreeType][itemKey];
			const wantedLevel = wantedResearchState[currentTreeType][itemKey];
			const row = document.createElement('tr');
			row.innerHTML = `<td>${itemKey}</td><td>${existingLevel}</td><td>${wantedLevel}</td>`;
			debugTableBody.appendChild(row);
		});
	} else {
		debugTable.style.display = 'none';
	}
}

function syncWantedResearchState() {
	Object.keys(existingResearchState).forEach(treeType => {
		Object.keys(existingResearchState[treeType]).forEach(itemKey => {
			if (wantedResearchState[treeType][itemKey] < existingResearchState[treeType][itemKey]) {
				wantedResearchState[treeType][itemKey] = existingResearchState[treeType][itemKey];
			}
		});
	});
}

function updateResearchMode_ExistingOrWanted(mode) {
	if (debugMode) console.log("updateResearchMode_ExistingOrWanted called on mode:", mode);

	currentMode = mode;
	currentWantedOrExistingResearchState = mode === 'wanted' ? wantedResearchState : existingResearchState;
	syncWantedResearchState();
	renderResearchTree();
}

// Adjust the behavior of upgrades in wanted research
function handleUpgrade(researchItemID, researchTreeType, currentLevel, maxLevel) {
    // In wanted mode, check if recursive upgrade is allowed
    if (currentMode === 'wanted' && !allowRecursiveUpgradeWanted) {
        if (currentLevel < maxLevel) {
            currentWantedOrExistingResearchState[researchTreeType][researchItemID]++;
        } else {
            if (debugMode) {
                console.log(`Max level reached for ${researchItemID}`);
            }
        }
    } else {
        // Allow recursive upgrades in 'existing' mode or if allowed in 'wanted' mode
        recursiveUpgrade(researchItemID, researchTreeType, currentLevel + 1);
    }

    // Re-render the research tree to reflect upgrades
    renderResearchTree();
}


// Adjusted upgrade logic to enforce max level in existing research
function recursiveUpgrade(researchItemID, researchTreeType, targetLevel) {
    const item = researchConfigData[researchTreeType][researchItemID];
    const maxLevel = Object.keys(item.levels).length;

    // Ensure we don't exceed the max level
    if (targetLevel > maxLevel) {
        if (debugMode) {
            console.log(`Cannot upgrade ${researchItemID} beyond max level of ${maxLevel}.`);
        }
        return;
    }

    // Check prerequisites for the current item
    const prerequisites = item.levels[targetLevel]?.requirements?.['research-items'];
    if (prerequisites) {
        // Recursively upgrade prerequisites
        Object.entries(prerequisites).forEach(([prereqID, prereqLevel]) => {
            if (existingResearchState[researchTreeType][prereqID] < prereqLevel) {
                recursiveUpgrade(prereqID, researchTreeType, prereqLevel);
            }
        });
    }

    // Upgrade the current item
    existingResearchState[researchTreeType][researchItemID] = targetLevel;
}


function recursiveDowngrade(researchItemID, researchTreeType, newLevel) {
	currentWantedOrExistingResearchState[researchItemID] = newLevel;
	Object.keys(researchConfigData[researchTreeType]).forEach(otherResearchID => {
		const otherResearch = researchConfigData[researchTreeType][otherResearchID];
		if (otherResearch.row > researchConfigData[researchTreeType][researchItemID].row) {
			const requirementsForNextLevel = otherResearch.levels[currentWantedOrExistingResearchState[otherResearchID] + 1]?.requirements?.['research-items'];
			if (requirementsForNextLevel && requirementsForNextLevel[researchItemID] > newLevel) {
				recursiveDowngrade(otherResearchID, researchTreeType, requirementsForNextLevel[researchItemID] - 1);
			}
		}
	});
}

function isBlockedFromDowngrade(researchItemID, researchTreeType) {
	const currentResearchLevel = wantedResearchState[researchTreeType][researchItemID];
	for (const otherResearchID of Object.keys(researchConfigData[researchTreeType])) {
		const otherResearch = researchConfigData[researchTreeType][otherResearchID];
		const nextLevel = wantedResearchState[researchTreeType][otherResearchID] - 1;
		const requirementsForNextLevel = otherResearch.levels[nextLevel]?.requirements?.['research-items'];
		if (requirementsForNextLevel && requirementsForNextLevel[researchItemID] > currentResearchLevel) {
			if (debugMode) console.log(`Blocked downgrade for ${researchItemID} because ${otherResearchID} requires it at a higher level.`);
			return true;
		}
	}
	return false;
}

// Function to handle tab switching
function handleModeAndTreeSelectorButtons(selectedTabId) {
	if (debugMode) console.log(`handleModeAndTreeSelectorButtons being called with selectedTabId:${selectedTabId} `);

	if (selectedTabId === 'growth-tree-btn') {
		currentTreeType = 'Growth';
		document.getElementById('growth-tree-btn').classList.add('active');
		document.getElementById('economy-tree-btn').classList.remove('active');
		document.getElementById('battle-tree-btn').classList.remove('active');
	} else if (selectedTabId === 'economy-tree-btn') {
		currentTreeType = 'Economy';
		document.getElementById('growth-tree-btn').classList.remove('active');
		document.getElementById('economy-tree-btn').classList.add('active');
		document.getElementById('battle-tree-btn').classList.remove('active');
	} else if (selectedTabId === 'battle-tree-btn') {
		currentTreeType = 'Battle';
		document.getElementById('growth-tree-btn').classList.remove('active');
		document.getElementById('economy-tree-btn').classList.remove('active');
		document.getElementById('battle-tree-btn').classList.add('active');
	}

	if (selectedTabId === 'wanted-research-btn') {
		updateResearchMode_ExistingOrWanted('wanted');
		document.getElementById('wanted-research-btn').classList.add('active');
		document.getElementById('existing-research-btn').classList.remove('active');
	} else if (selectedTabId === 'existing-research-btn') {
		updateResearchMode_ExistingOrWanted('existing');
		document.getElementById('wanted-research-btn').classList.remove('active');
		document.getElementById('existing-research-btn').classList.add('active');
	}

	document.getElementById('researchTable').innerHTML = '';
	renderResearchTree();

	if (debugMode) console.log(`Switched to ${selectedTabId} (Type: ${currentTreeType})`);
}

// Attach event listeners for tab switching
document.addEventListener('DOMContentLoaded', function () {
	checkUrlGetParameters(); 
	loadresearchConfigData();

	const modeAndTreeSelectorButtons = document.querySelectorAll('.mode-selector-btn, .tree-selector-btn');
	modeAndTreeSelectorButtons.forEach(tab => {
		tab.addEventListener('click', function (event) {
			const selectedTabId = event.target.getAttribute('id');
			handleModeAndTreeSelectorButtons(selectedTabId);
		});
	});
});

// Event listener for research speed input
document.getElementById('researchSpeedInput').addEventListener('input', function () {
	renderResearchTree();
});

// Function to handle the global recursive upgrade toggle
document.getElementById('recursiveUpgradeToggle').addEventListener('change', function () {
    allowRecursiveUpgradeWanted = this.checked;
    if (debugMode) {
        console.log(`Recursive upgrade enabled: ${allowRecursiveUpgradeWanted}`);
    }
    renderResearchTree(); // Re-render the research tree to apply the toggle change
});

document.getElementById('requirementsToggle').addEventListener('change', function () {
    renderResearchTree(); // Re-render the research tree to apply the toggle change
});
