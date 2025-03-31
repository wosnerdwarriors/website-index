document.addEventListener('DOMContentLoaded', function() {
	let characters = JSON.parse(localStorage.getItem('characters')) || {};
	let selectedCharacter = null;

	function showMessage(message) {
		const messageBar = document.getElementById('message-bar');
		messageBar.textContent = message || '';
		messageBar.style.display = 'block';
	}

	function updateCharacterList() {
		const charactersDropdown = document.getElementById('characters');
		charactersDropdown.innerHTML = '';
		Object.keys(characters).forEach(name => {
			const option = document.createElement('option');
			option.value = name;
			option.textContent = name;
			charactersDropdown.appendChild(option);
		});
	}

	function loadCharacter(name) {
		const character = characters[name];
		if (character) {
			document.getElementById('num_marches').value = character.numMarches;
			document.getElementById('max_march_size').value = character.maxMarchSize;

			document.getElementById('infantry_t11').value = character.troops.infantry.t11 || 0;
			document.getElementById('lancer_t11').value = character.troops.lancer.t11 || 0;
			document.getElementById('marksman_t11').value = character.troops.marksman.t11 || 0;

			selectedCharacter = name;
			showMessage(`Character "${name}" loaded.`);
		}
	}

	function saveCharacter(name) {
		const numMarches = parseInt(document.getElementById('num_marches').value) || 0;
		const maxMarchSize = parseInt(document.getElementById('max_march_size').value) || 0;

		const infantry = {
			t11: parseInt(document.getElementById('infantry_t11').value) || 0
		};

		const lancer = {
			t11: parseInt(document.getElementById('lancer_t11').value) || 0
		};

		const marksman = {
			t11: parseInt(document.getElementById('marksman_t11').value) || 0
		};

		characters[name] = {
			numMarches,
			maxMarchSize,
			troops: { infantry, lancer, marksman }
		};

		localStorage.setItem('characters', JSON.stringify(characters));
		updateCharacterList();
		showMessage(`Character "${name}" saved.`);
	}

	function deleteCharacter(name) {
		delete characters[name];
		localStorage.setItem('characters', JSON.stringify(characters));
		updateCharacterList();
		showMessage(`Character "${name}" deleted.`);
		if (selectedCharacter === name) {
			selectedCharacter = null;
			clearScreen();
		}
	}

	function clearScreen() {
		document.getElementById('num_marches').value = '';
		document.getElementById('max_march_size').value = '';
		document.getElementById('infantry_t11').value = '';
		document.getElementById('lancer_t11').value = '';
		document.getElementById('marksman_t11').value = '';
		selectedCharacter = null;
		showMessage('Screen cleared.');
	}

	// Initial load of character list
	updateCharacterList();

	// Event listeners
	document.getElementById('load-btn').addEventListener('click', function() {
		const selected = document.getElementById('characters').value;
		if (selected) {
			loadCharacter(selected);
		} else {
			showMessage('Please select a character to load.');
		}
	});

	document.getElementById('save-btn').addEventListener('click', function() {
		if (selectedCharacter) {
			saveCharacter(selectedCharacter);
		} else {
			showMessage('Please select a character or create a new one.');
		}
	});

	document.getElementById('new-character-btn').addEventListener('click', function() {
		const nameInput = document.getElementById('character-name-input');
		nameInput.style.display = 'block';
		nameInput.focus();
		nameInput.addEventListener('keypress', function(event) {
			if (event.key === 'Enter') {
				const name = nameInput.value.trim();
				if (name && !characters[name]) {
					saveCharacter(name);
					selectedCharacter = name;
					showMessage(`New character "${name}" created.`);
				} else if (characters[name]) {
					showMessage('Character with this name already exists.');
				} else {
					showMessage('Please enter a valid name.');
				}
				nameInput.value = '';
				nameInput.style.display = 'none';
			}
		});
	});

	document.getElementById('delete-btn').addEventListener('click', function() {
		const selected = document.getElementById('characters').value;
		if (selected) {
			deleteCharacter(selected);
		} else {
			showMessage('Please select a character to delete.');
		}
	});

	document.getElementById('delete-all-btn').addEventListener('click', function() {
		localStorage.removeItem('characters');
		characters = {};
		updateCharacterList();
		showMessage('All characters deleted.');
		clearScreen();
	});

	document.getElementById('clear-screen-btn').addEventListener('click', function() {
		clearScreen();
	});

	document.getElementById('upload-btn').addEventListener('click', function() {
		const fileInput = document.getElementById('file-upload');
		const file = fileInput.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = function(e) {
				const data = JSON.parse(e.target.result);
				characters = { ...characters, ...data };
				localStorage.setItem('characters', JSON.stringify(characters));
				updateCharacterList();
				showMessage('Data uploaded successfully.');
			};
			reader.readAsText(file);
		} else {
			showMessage('Please select a file to upload.');
		}
	});

	document.getElementById('download-btn').addEventListener('click', function() {
		const dataStr = JSON.stringify(characters, null, 2);
		const blob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'characters.json';
		a.click();
		URL.revokeObjectURL(url);
		showMessage('Data downloaded successfully.');
	});

	// Show initial message if any
	showMessage('');

	// Troop Allocation and March Generation
	document.getElementById('generate-btn').addEventListener('click', function() {
		console.log("==================== STARTING TROOP ALLOCATION AND MARCH GENERATION ====================");
		
		const numMarches = parseInt(document.getElementById('num_marches').value) || 0;
		const maxMarchSize = parseInt(document.getElementById('max_march_size').value) || 0;
		console.log(`DEBUG - Initial Parameters: numMarches=${JSON.stringify(numMarches)}, maxMarchSize=${JSON.stringify(maxMarchSize)}`);

		const infantryMin = parseInt(document.getElementById('infantry_min').value) || 0;
		const lancerMax = parseInt(document.getElementById('lancer_max').value) || 0;
		const marksmanMax = parseInt(document.getElementById('marksman_max').value) || 0;
		console.log(`DEBUG - Troop Distribution Parameters: infantryMin=${JSON.stringify(infantryMin)}%, lancerMax=${JSON.stringify(lancerMax)}%, marksmanMax=${JSON.stringify(marksmanMax)}%`);
			console.log(`DEBUG - Troop Distribution Parameters (raw): infantryMin=${JSON.stringify(document.getElementById('infantry_min').value)}, lancerMax=${JSON.stringify(document.getElementById('lancer_max').value)}, marksmanMax=${JSON.stringify(document.getElementById('marksman_max').value)}`);

		let totalTroops = {
			infantry: parseInt(document.getElementById('infantry_t11').value) || 0,
			lancer: parseInt(document.getElementById('lancer_t11').value) || 0,
			marksman: parseInt(document.getElementById('marksman_t11').value) || 0
		};
		console.log(`DEBUG - Total Available Troops: ${JSON.stringify(totalTroops)}`);
		console.log(`DEBUG - Total Troop Count: ${JSON.stringify(totalTroops.infantry + totalTroops.lancer + totalTroops.marksman)}`);
			console.log(`DEBUG - Raw input values: infantry=${JSON.stringify(document.getElementById('infantry_t11').value)}, lancer=${JSON.stringify(document.getElementById('lancer_t11').value)}, marksman=${JSON.stringify(document.getElementById('marksman_t11').value)}`);

		const marches = Array(numMarches).fill().map(() => ({
			infantry: 0,
			lancer: 0,
			marksman: 0,
			total: 0
		}));
		console.log(`DEBUG - Created ${JSON.stringify(numMarches)} empty marches: ${JSON.stringify(marches)}`);

		// Step 1: Fill Infantry Min
		const infantryMinTroops = Math.floor(infantryMin / 100 * maxMarchSize);
		console.log(`DEBUG - Step 1: Fill Infantry Min - Calculated infantryMinTroops=${JSON.stringify(infantryMinTroops)} per march (${JSON.stringify(infantryMin)}% of ${JSON.stringify(maxMarchSize)})`); 
		console.log(`DEBUG - Step 1: Formula details: Math.floor(${JSON.stringify(infantryMin)} / 100 * ${JSON.stringify(maxMarchSize)}) = ${JSON.stringify(infantryMinTroops)}`);
		console.log(`DEBUG - Step 1: Total infantry available before allocation: ${JSON.stringify(totalTroops.infantry)}`);
		
		const allocateInfantry = Math.min(infantryMinTroops,  Math.floor(totalTroops.infantry  / numMarches));
		for (let i = 0; i < numMarches; i++) {
			
			console.log(`DEBUG - Step 1: March #${JSON.stringify(i+1)} - Min calculation: Math.min(${JSON.stringify(infantryMinTroops)}, Math.floor(${JSON.stringify(totalTroops.infantry)} / ${JSON.stringify(numMarches)})) = ${JSON.stringify(allocateInfantry)}`);
			console.log(`DEBUG - Step 1: March #${JSON.stringify(i+1)} - Allocating ${JSON.stringify(allocateInfantry)} infantry (min of ${JSON.stringify(infantryMinTroops)} and Math.floor(${JSON.stringify(totalTroops.infantry)} / ${JSON.stringify(numMarches)}) available)`);
			
			const oldMarchData = JSON.parse(JSON.stringify(marches[i]));
			marches[i].infantry += allocateInfantry;
			marches[i].total += allocateInfantry;
			const oldTotalTroops = JSON.parse(JSON.stringify(totalTroops));
			totalTroops.infantry -= allocateInfantry;
			
			console.log(`DEBUG - Step 1: March #${JSON.stringify(i+1)} - March before: ${JSON.stringify(oldMarchData)}`);
			console.log(`DEBUG - Step 1: March #${JSON.stringify(i+1)} - March after: ${JSON.stringify(marches[i])}`);
			console.log(`DEBUG - Step 1: Troops before: ${JSON.stringify(oldTotalTroops)}`);
			console.log(`DEBUG - Step 1: Troops after: ${JSON.stringify(totalTroops)}`);
		}
		console.log(`DEBUG - Step 1: Infantry allocation complete. Marches: ${JSON.stringify(marches)}`);
		console.log(`DEBUG - Step 1: Remaining troops: ${JSON.stringify(totalTroops)}`);

		// Step 2: Fill Lancer Max
		const lancerMaxTroops = Math.floor(lancerMax / 100 * maxMarchSize);
		console.log(`DEBUG - Step 2: Fill Lancer Max - Calculated lancerMaxTroops=${JSON.stringify(lancerMaxTroops)} per march (${JSON.stringify(lancerMax)}% of ${JSON.stringify(maxMarchSize)})`);
		console.log(`DEBUG - Step 2: Formula details: Math.floor(${JSON.stringify(lancerMax)} / 100 * ${JSON.stringify(maxMarchSize)}) = ${JSON.stringify(lancerMaxTroops)}`);
		console.log(`DEBUG - Step 2: Total lancer available before allocation: ${JSON.stringify(totalTroops.lancer)}`);
		const allocateLancer = Math.min(lancerMaxTroops, Math.floor(totalTroops.lancer / numMarches));

		for (let i = 0; i < numMarches; i++) {
			console.log(`DEBUG - Step 2: March #${JSON.stringify(i+1)} - Processing loop iteration ${JSON.stringify(i)}`);
			console.log(`DEBUG - Step 2: March #${JSON.stringify(i+1)} - Min calculation: Math.min(${JSON.stringify(lancerMaxTroops)}, Math.floor(${JSON.stringify(totalTroops.lancer)} / ${JSON.stringify(numMarches)})) = ${JSON.stringify(allocateLancer)}`);
			console.log(`DEBUG - Step 2: March #${JSON.stringify(i+1)} - Allocating ${JSON.stringify(allocateLancer)} lancers (min of ${JSON.stringify(lancerMaxTroops)} and Math.floor(${JSON.stringify(totalTroops.lancer)} / ${JSON.stringify(numMarches)}) available)`);
			
			const oldMarchData = JSON.parse(JSON.stringify(marches[i]));
			marches[i].lancer += allocateLancer;
			marches[i].total += allocateLancer;
			const oldTotalTroops = JSON.parse(JSON.stringify(totalTroops));
			totalTroops.lancer -= allocateLancer;
			
			console.log(`DEBUG - Step 2: March #${JSON.stringify(i+1)} - March before: ${JSON.stringify(oldMarchData)}`);
			console.log(`DEBUG - Step 2: March #${JSON.stringify(i+1)} - March after: ${JSON.stringify(marches[i])}`);
			console.log(`DEBUG - Step 2: Troops before: ${JSON.stringify(oldTotalTroops)}`);
			console.log(`DEBUG - Step 2: Troops after: ${JSON.stringify(totalTroops)}`);
		}
		console.log(`DEBUG - Step 2: Lancer allocation complete. Marches: ${JSON.stringify(marches)}`);
		console.log(`DEBUG - Step 2: Remaining troops: ${JSON.stringify(totalTroops)}`);

		// Step 3: Fill Marksman Max
		const marksmanMaxTroops = Math.floor(marksmanMax / 100 * maxMarchSize);
		console.log(`DEBUG - Step 3: Fill Marksman Max - Calculated marksmanMaxTroops=${JSON.stringify(marksmanMaxTroops)} per march (${JSON.stringify(marksmanMax)}% of ${JSON.stringify(maxMarchSize)})`); 
		console.log(`DEBUG - Step 3: Formula details: Math.floor(${JSON.stringify(marksmanMax)} / 100 * ${JSON.stringify(maxMarchSize)}) = ${JSON.stringify(marksmanMaxTroops)}`);
		console.log(`DEBUG - Step 3: Total marksman available before allocation: ${JSON.stringify(totalTroops.marksman)}`);
		const allocatemarksman = Math.min(marksmanMaxTroops, Math.floor(totalTroops.marksman / numMarches));

		for (let i = 0; i < numMarches; i++) {
			console.log(`DEBUG - Step 3: March #${JSON.stringify(i+1)} - Processing loop iteration ${JSON.stringify(i)}`);
			console.log(`DEBUG - Step 3: March #${JSON.stringify(i+1)} - Min calculation: Math.min(${JSON.stringify(marksmanMaxTroops)}, Math.floor(${JSON.stringify(totalTroops.marksman)} / ${JSON.stringify(numMarches)})) = ${JSON.stringify(allocatemarksman)}`);
			console.log(`DEBUG - Step 3: March #${JSON.stringify(i+1)} - Allocating ${JSON.stringify(allocatemarksman)} marksmen (min of ${JSON.stringify(marksmanMaxTroops)} and Math.floor(${JSON.stringify(totalTroops.marksman)} / ${JSON.stringify(numMarches)}) available)`);
			
			const oldMarchData = JSON.parse(JSON.stringify(marches[i]));
			marches[i].marksman += allocatemarksman;
			marches[i].total += allocatemarksman;
			const oldTotalTroops = JSON.parse(JSON.stringify(totalTroops));
			totalTroops.marksman -= allocatemarksman;
			
			console.log(`DEBUG - Step 3: March #${JSON.stringify(i+1)} - March before: ${JSON.stringify(oldMarchData)}`);
			console.log(`DEBUG - Step 3: March #${JSON.stringify(i+1)} - March after: ${JSON.stringify(marches[i])}`);
			console.log(`DEBUG - Step 3: Troops before: ${JSON.stringify(oldTotalTroops)}`);
			console.log(`DEBUG - Step 3: Troops after: ${JSON.stringify(totalTroops)}`);
		}
		console.log(`DEBUG - Step 3: Marksman allocation complete. Marches: ${JSON.stringify(marches)}`);
		console.log(`DEBUG - Step 3: Remaining troops: ${JSON.stringify(totalTroops)}`);

		console.log(`DEBUG - FINAL MARCH CONFIGURATIONS: ${JSON.stringify(marches, null, 2)}`);
		console.log("==================== TROOP ALLOCATION AND MARCH GENERATION COMPLETE ====================");

		// Display the results in a more mobile-friendly format
		const resultsDiv = document.getElementById('results');
		resultsDiv.innerHTML = '<h2 class="text-lg font-semibold mb-4">Formation Results</h2>';
		
		// Add toggle button for desktop/mobile view
		const viewToggle = document.createElement('div');
		viewToggle.className = 'mb-4';
		viewToggle.innerHTML = `
			<div class="flex flex-wrap gap-2 mb-4">
				<button id="table-view-btn" class="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600">Table View</button>
				<button id="card-view-btn" class="bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300">Card View</button>
			</div>
		`;
		resultsDiv.appendChild(viewToggle);
		
		// Container for both views
		const viewsContainer = document.createElement('div');
		viewsContainer.className = 'views-container';
		resultsDiv.appendChild(viewsContainer);

		// Create the table view (desktop-friendly)
		const tableView = document.createElement('div');
		tableView.id = 'table-view';
		tableView.className = 'overflow-x-auto';
		
		// Create the table element
		const table = document.createElement('table');
		table.className = 'min-w-full bg-white border border-gray-200';

		// Create the table header
		const thead = document.createElement('thead');
		thead.className = 'bg-gray-100';
		thead.innerHTML = `
			<tr>
				<th class="border px-4 py-2">March #</th>
				<th class="border px-4 py-2">Infantry</th>
				<th class="border px-4 py-2">Lancer</th>
				<th class="border px-4 py-2">Marksman</th>
				<th class="border px-4 py-2">Total</th>
				<th class="border px-4 py-2">% Infantry</th>
				<th class="border px-4 py-2">% Lancer</th>
				<th class="border px-4 py-2">% Marksman</th>
			</tr>
		`;
		table.appendChild(thead);

		// Create the table body
		const tbody = document.createElement('tbody');
		tbody.className = 'divide-y divide-gray-200';
		marches.forEach((march, index) => {
			const infantryPercent = ((march.infantry / march.total) * 100).toFixed(1);
			const lancerPercent = ((march.lancer / march.total) * 100).toFixed(1);
			const marksmanPercent = ((march.marksman / march.total) * 100).toFixed(1);

			const row = document.createElement('tr');
			row.innerHTML = `
				<td class="border px-4 py-2">${index + 1}</td>
				<td class="border px-4 py-2">${march.infantry}</td>
				<td class="border px-4 py-2">${march.lancer}</td>
				<td class="border px-4 py-2">${march.marksman}</td>
				<td class="border px-4 py-2">${march.total}</td>
				<td class="border px-4 py-2">${infantryPercent}%</td>
				<td class="border px-4 py-2">${lancerPercent}%</td>
				<td class="border px-4 py-2">${marksmanPercent}%</td>
			`;
			tbody.appendChild(row);
		});
		table.appendChild(tbody);
		tableView.appendChild(table);
		viewsContainer.appendChild(tableView);
		
		// Create card view (mobile-friendly)
		const cardView = document.createElement('div');
		cardView.id = 'card-view';
		cardView.className = 'hidden';
		
		marches.forEach((march, index) => {
			const infantryPercent = ((march.infantry / march.total) * 100).toFixed(1);
			const lancerPercent = ((march.lancer / march.total) * 100).toFixed(1);
			const marksmanPercent = ((march.marksman / march.total) * 100).toFixed(1);
			
			const card = document.createElement('div');
			card.className = 'bg-gray-50 p-4 rounded border border-gray-200 mb-4';
			
			card.innerHTML = `
				<h3 class="font-bold text-lg mb-2">March #${index + 1}</h3>
				<div class="flex flex-col space-y-2 mb-3">
					<div class="bg-white p-2 rounded border border-gray-200 flex justify-between items-center">
						<span class="font-medium">Total:</span>
						<span class="font-bold">${march.total}</span>
					</div>
					<div class="bg-blue-50 p-2 rounded border border-blue-200 flex justify-between items-center">
						<span class="font-medium text-blue-800">Infantry:</span>
						<span>
							<span class="font-bold">${march.infantry}</span>
							<span class="text-sm text-gray-600 ml-2">(${infantryPercent}%)</span>
						</span>
					</div>
					<div class="bg-green-50 p-2 rounded border border-green-200 flex justify-between items-center">
						<span class="font-medium text-green-800">Lancer:</span>
						<span>
							<span class="font-bold">${march.lancer}</span>
							<span class="text-sm text-gray-600 ml-2">(${lancerPercent}%)</span>
						</span>
					</div>
					<div class="bg-red-50 p-2 rounded border border-red-200 flex justify-between items-center">
						<span class="font-medium text-red-800">Marksman:</span>
						<span>
							<span class="font-bold">${march.marksman}</span>
							<span class="text-sm text-gray-600 ml-2">(${marksmanPercent}%)</span>
						</span>
					</div>
				</div>
			`;
			
			cardView.appendChild(card);
		});
		viewsContainer.appendChild(cardView);
		
		// Add event listeners for toggle buttons
		document.getElementById('table-view-btn').addEventListener('click', function() {
			document.getElementById('table-view').classList.remove('hidden');
			document.getElementById('card-view').classList.add('hidden');
			this.classList.remove('bg-gray-200', 'text-gray-800');
			this.classList.add('bg-blue-500', 'text-white');
			document.getElementById('card-view-btn').classList.remove('bg-blue-500', 'text-white');
			document.getElementById('card-view-btn').classList.add('bg-gray-200', 'text-gray-800');
		});
		
		document.getElementById('card-view-btn').addEventListener('click', function() {
			document.getElementById('card-view').classList.remove('hidden');
			document.getElementById('table-view').classList.add('hidden');
			this.classList.remove('bg-gray-200', 'text-gray-800');
			this.classList.add('bg-blue-500', 'text-white');
			document.getElementById('table-view-btn').classList.remove('bg-blue-500', 'text-white');
			document.getElementById('table-view-btn').classList.add('bg-gray-200', 'text-gray-800');
		});
		
		// Auto-select card view on mobile, table view on desktop
		if (window.innerWidth < 768) {
			document.getElementById('card-view-btn').click();
		}
	});
});