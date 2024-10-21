// Utility function to show messages in the message box
function showMessage(message, type = 'info') {
	const messages = document.getElementById('messages');
	messages.className = `alert alert-${type}`;
	messages.textContent = message;
	messages.style.display = 'block';
	setTimeout(() => {
		messages.style.display = 'none';
	}, 3000);
}

// Load alliances from local storage
function loadAlliances() {
	const allianceSelect = document.getElementById('alliance_select');
	const alliances = JSON.parse(localStorage.getItem('alliances')) || [];
	allianceSelect.innerHTML = '';  // Clear existing options
	alliances.forEach(alliance => {
		const option = document.createElement('option');
		option.value = alliance.name;
		option.textContent = alliance.name;
		allianceSelect.appendChild(option);
	});
}

function calculateMaxBannersPerDay(rate, costPerBanner) {
	return Math.floor((rate * 24) / costPerBanner);
}

function updateFarms() {
	const meatRate = parseInt(document.getElementById('meat_rate').value) || 0;
	const woodRate = parseInt(document.getElementById('wood_rate').value) || 0;
	const coalRate = parseInt(document.getElementById('coal_rate').value) || 0;
	const ironRate = parseInt(document.getElementById('iron_rate').value) || 0;

	const meatFarms = Math.floor(meatRate / 3600);
	const woodFarms = Math.floor(woodRate / 3600);
	const coalFarms = Math.floor(coalRate / 3600);
	const ironFarms = Math.floor(ironRate / 3600);

	updateFarmElement('meat_farms', meatFarms, meatRate % 3600);
	updateFarmElement('wood_farms', woodFarms, woodRate % 3600);
	updateFarmElement('coal_farms', coalFarms, coalRate % 3600);
	updateFarmElement('iron_farms', ironFarms, ironRate % 3600);

	const maxBannersPerDay = Math.min(
		calculateMaxBannersPerDay(meatRate, 201300),
		calculateMaxBannersPerDay(woodRate, 201300),
		calculateMaxBannersPerDay(coalRate, 134200),
		calculateMaxBannersPerDay(ironRate, 73200)
	);

	updateTable(maxBannersPerDay, meatFarms, woodFarms, coalFarms, ironFarms);
}

function updateFarmElement(elementId, farms, remainder) {
	const element = document.getElementById(elementId);
	element.textContent = farms;
	element.style.color = remainder === 0 ? 'green' : 'red';
}

function updateTable(maxBannersPerDay, meatFarms, woodFarms, coalFarms, ironFarms) {
	const bannersTableBody = document.getElementById('banners_table');
	bannersTableBody.innerHTML = '';

	for (let banners = maxBannersPerDay; banners <= maxBannersPerDay + 15; banners++) {
		const extraMeatFarms = Math.max(0, Math.ceil(((banners * 201300) / (24 * 3600)) - meatFarms));
		const extraWoodFarms = Math.max(0, Math.ceil(((banners * 201300) / (24 * 3600)) - woodFarms));
		const extraCoalFarms = Math.max(0, Math.ceil(((banners * 134200) / (24 * 3600)) - coalFarms));
		const extraIronFarms = Math.max(0, Math.ceil(((banners * 73200) / (24 * 3600)) - ironFarms));

		const row = `<tr>
			<td>${banners}</td>
			<td>${extraMeatFarms}</td>
			<td>${extraWoodFarms}</td>
			<td>${extraCoalFarms}</td>
			<td>${extraIronFarms}</td>
		</tr>`;

		bannersTableBody.innerHTML += row;
	}
}

function loadAlliance() {
	const allianceSelect = document.getElementById('alliance_select');
	const selectedAlliances = Array.from(allianceSelect.selectedOptions);
	if (selectedAlliances.length > 1) {
		showMessage('Please select only one alliance to load.', 'danger');
		return;
	}

	const allianceName = allianceSelect.value;
	if (!allianceName) return;

	const alliances = JSON.parse(localStorage.getItem('alliances')) || [];
	const alliance = alliances.find(a => a.name === allianceName);
	if (alliance) {
		document.getElementById('meat_rate').value = alliance.meat_rate;
		document.getElementById('wood_rate').value = alliance.wood_rate;
		document.getElementById('coal_rate').value = alliance.coal_rate;
		document.getElementById('iron_rate').value = alliance.iron_rate;
		updateFarms();
		showMessage(`Loaded alliance: ${allianceName}`);
	}
}

function saveAlliance() {
	const allianceSelect = document.getElementById('alliance_select');
	const allianceName = allianceSelect.value;
	if (!allianceName) {
		showMessage('Please select an alliance to save.', 'danger');
		return;
	}

	const alliances = JSON.parse(localStorage.getItem('alliances')) || [];
	const existingAllianceIndex = alliances.findIndex(a => a.name === allianceName);

	const allianceData = {
		name: allianceName,
		meat_rate: parseInt(document.getElementById('meat_rate').value) || 0,
		wood_rate: parseInt(document.getElementById('wood_rate').value) || 0,
		coal_rate: parseInt(document.getElementById('coal_rate').value) || 0,
		iron_rate: parseInt(document.getElementById('iron_rate').value) || 0
	};

	if (existingAllianceIndex !== -1) {
		alliances[existingAllianceIndex] = allianceData;
	} else {
		alliances.push(allianceData);
	}

	localStorage.setItem('alliances', JSON.stringify(alliances));
	showMessage(`Alliance "${allianceName}" saved successfully!`);
	loadAlliances();  // Refresh the alliance list
}

function createAlliance() {
	const newAllianceNameInput = document.getElementById('new_alliance_name');
	const allianceName = newAllianceNameInput.value.trim();
	if (!allianceName) {
		showMessage('Please enter a name for the new alliance.', 'danger');
		return;
	}

	const alliances = JSON.parse(localStorage.getItem('alliances')) || [];
	if (alliances.find(a => a.name === allianceName)) {
		showMessage('Alliance with this name already exists.', 'danger');
		return;
	}

	const allianceData = {
		name: allianceName,
		meat_rate: parseInt(document.getElementById('meat_rate').value) || 0,
		wood_rate: parseInt(document.getElementById('wood_rate').value) || 0,
		coal_rate: parseInt(document.getElementById('coal_rate').value) || 0,
		iron_rate: parseInt(document.getElementById('iron_rate').value) || 0
	};

	alliances.push(allianceData);
	localStorage.setItem('alliances', JSON.stringify(alliances));
	showMessage(`New alliance "${allianceName}" created successfully!`);
	newAllianceNameInput.value = '';  // Clear the input field
	loadAlliances();  // Refresh the alliance list
	document.getElementById('alliance_select').value = allianceName;
	updateFarms();  // Update farms based on the new alliance's data
}

function deleteAlliance() {
	const allianceSelect = document.getElementById('alliance_select');
	const allianceName = allianceSelect.value;
	if (!allianceName) {
		showMessage('Please select an alliance to delete.', 'danger');
		return;
	}

	let alliances = JSON.parse(localStorage.getItem('alliances')) || [];
	alliances = alliances.filter(a => a.name !== allianceName);

	localStorage.setItem('alliances', JSON.stringify(alliances));
	showMessage(`Alliance "${allianceName}" deleted successfully!`);
	loadAlliances();  // Refresh the alliance list
	updateFarms();  // Clear the farms display since the alliance is deleted
}

function clearAllAlliances() {
	localStorage.removeItem('alliances');
	showMessage('All alliances have been cleared!', 'warning');
	loadAlliances();  // Refresh the alliance list
	updateFarms();  // Clear the farms display since all alliances are deleted
}

function clearResources() {
	document.getElementById('meat_rate').value = 0;
	document.getElementById('wood_rate').value = 0;
	document.getElementById('coal_rate').value = 0;
	document.getElementById('iron_rate').value = 0;
	updateFarms();
	showMessage('All resource rates have been cleared to 0.', 'info');
}

document.addEventListener('DOMContentLoaded', function() {
	// Define DOM elements
	const loadAllianceButton = document.getElementById('load_alliance');
	const saveAllianceButton = document.getElementById('save_alliance');
	const createAllianceButton = document.getElementById('create_alliance');
	const deleteAllianceButton = document.getElementById('delete_alliance');
	const clearAllButton = document.getElementById('clear_all');
	const clearResourcesButton = document.getElementById('clear_resources');

	// Set up event listeners
	loadAllianceButton.addEventListener('click', loadAlliance);
	saveAllianceButton.addEventListener('click', saveAlliance);
	createAllianceButton.addEventListener('click', createAlliance);
	deleteAllianceButton.addEventListener('click', deleteAlliance);
	clearAllButton.addEventListener('click', clearAllAlliances);
	clearResourcesButton.addEventListener('click', clearResources);

	// Add event listeners for input fields to update farms dynamically
	document.getElementById('meat_rate').addEventListener('input', updateFarms);
	document.getElementById('wood_rate').addEventListener('input', updateFarms);
	document.getElementById('coal_rate').addEventListener('input', updateFarms);
	document.getElementById('iron_rate').addEventListener('input', updateFarms);

	// Initial load of alliances and farms
	loadAlliances();  
	updateFarms();  
});

