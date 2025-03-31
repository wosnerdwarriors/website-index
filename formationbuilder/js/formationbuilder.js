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
	console.log("=== STARTING MARCH GENERATION ===");
	
	// Input values
	const numMarches = parseInt(document.getElementById('num_marches').value) || 1;
	const maxMarchSize = parseInt(document.getElementById('max_march_size').value) || 1;
	console.log(`Input - Number of Marches: ${numMarches}, Max March Size: ${maxMarchSize}`);

	const infantryMin = parseInt(document.getElementById('infantry_min').value) || 0;
	const lancerMax = parseInt(document.getElementById('lancer_max').value) || 0;
	const marksmanMax = parseInt(document.getElementById('marksman_max').value) || 0;
	console.log(`Input - Infantry Min %: ${infantryMin}, Lancer Max %: ${lancerMax}, Marksman Max %: ${marksmanMax}`);

	let totalTroops = {
		infantry: parseInt(document.getElementById('infantry_t11').value) || 0,
		lancer: parseInt(document.getElementById('lancer_t11').value) || 0,
		marksman: parseInt(document.getElementById('marksman_t11').value) || 0
	};
	console.log("Initial Total Troops:", JSON.stringify(totalTroops, null, 2));

	// Initialize marches
	const marches = Array(numMarches).fill().map(() => ({
		infantry: 0,
		lancer: 0,
		marksman: 0,
		total: 0,
		test: 0
	}));
	console.log(`Initialized ${numMarches} empty marches`);

	console.log(`marches(should be all 0)`, marches);
	marches[0].test = 10;
	console.log(`marches(after making march 0 test = 10`, marches);

	// ===== STEP 1: Fill Infantry Minimum =====
	console.log("\n=== STEP 1: FILLING INFANTRY MINIMUM ===");
	const infantryMinTroops = Math.floor(infantryMin / 100 * maxMarchSize);
	console.log(`Calculated infantry minimum troops per march: ${infantryMinTroops}`);

	for (let i = 0; i < numMarches; i++) {
		console.log(`\nProcessing March ${i + 1}/${numMarches}`);
		const allocate = Math.min(infantryMinTroops, Math.floor(totalTroops.infantry / numMarches));
		console.log(`Allocating ${allocate} infantry (min of ${infantryMinTroops} required or ${totalTroops.infantry} available)`);

		marches[i].infantry += allocate;
		marches[i].total += allocate;
		totalTroops.infantry -= allocate;

		console.log(`March ${i + 1} updated:`, marches[i]);
		console.log(`Remaining infantry: ${totalTroops.infantry}`);
	}

	// ===== STEP 2: Fill Lancer Maximum =====
	console.log("\n=== STEP 2: FILLING LANCER MAXIMUM ===");
	const lancerMaxTroops = Math.floor(lancerMax / 100 * maxMarchSize);
	console.log(`Calculated lancer maximum troops per march: ${lancerMaxTroops}`);

	for (let i = 0; i < numMarches; i++) {
		console.log(`\nProcessing March ${i + 1}/${numMarches}`);
		const allocate = Math.min(lancerMaxTroops, Math.floor(totalTroops.lancer/ numMarches));
		console.log(`Allocating ${allocate} lancers (min of ${lancerMaxTroops} max allowed or ${totalTroops.lancer} available)`);

		marches[i].lancer += allocate;
		marches[i].total += allocate;
		totalTroops.lancer -= allocate;

		console.log(`March ${i + 1} updated:`, marches[i]);
		console.log(`Remaining lancers: ${totalTroops.lancer}`);
	}

	// ===== STEP 3: Fill Marksman Maximum =====
	console.log("\n=== STEP 3: FILLING MARKSMAN MAXIMUM ===");
	const marksmanMaxTroops = Math.floor(marksmanMax / 100 * maxMarchSize);
	console.log(`Calculated marksman maximum troops per march: ${marksmanMaxTroops}`);

	for (let i = 0; i < numMarches; i++) {
		console.log(`\nProcessing March ${i + 1}/${numMarches}`);
		const allocate = Math.min(marksmanMaxTroops, Math.floor( totalTroops.marksman/ numMarches));
		console.log(`Allocating ${allocate} marksmen (min of ${marksmanMaxTroops} max allowed or ${totalTroops.marksman} available)`);

		marches[i].marksman += allocate;
		marches[i].total += allocate;
		totalTroops.marksman -= allocate;

		console.log(`March ${i + 1} updated:`, marches[i]);
		console.log(`Remaining marksmen: ${totalTroops.marksman}`);
	}

	// ===== STEP 4: Allocate Remaining Marksman =====
	console.log("\n=== STEP 4: ALLOCATING REMAINING MARKSMEN ===");
	console.log(`Remaining marksmen to distribute: ${totalTroops.marksman}`);

	for (let i = 0; i < numMarches; i++) {
		if (totalTroops.marksman > 0) {
			console.log(`\nProcessing March ${i + 1}/${numMarches}`);
			const remainingCapacity = maxMarchSize - marches[i].total;
			console.log(`March has ${remainingCapacity} remaining capacity`);

			const allocate = Math.min(remainingCapacity, Math.floor(  totalTroops.marksman/ numMarches));;
			console.log(`Allocating ${allocate} remaining marksmen`);

			marches[i].marksman += allocate;
			marches[i].total += allocate;
			totalTroops.marksman -= allocate;

			console.log(`March ${i + 1} updated:`, marches[i]);
			console.log(`Remaining marksmen: ${totalTroops.marksman}`);
		} else {
			console.log(`No more marksmen to allocate (March ${i + 1})`);
			break;
		}
	}

	// ===== STEP 5: Allocate Remaining Lancer =====
	console.log("\n=== STEP 5: ALLOCATING REMAINING LANCERS ===");
	console.log(`Remaining lancers to distribute: ${totalTroops.lancer}`);

	for (let i = 0; i < numMarches; i++) {
		if (totalTroops.lancer > 0) {
			console.log(`\nProcessing March ${i + 1}/${numMarches}`);
			const remainingCapacity = maxMarchSize - marches[i].total;
			console.log(`March has ${remainingCapacity} remaining capacity`);

			const allocate = Math.min(remainingCapacity, Math.floor( totalTroops.lancer/ numMarches));;
			console.log(`Allocating ${allocate} remaining marksmen`);
			console.log(`Allocating ${allocate} remaining lancers`);

			marches[i].lancer += allocate;
			marches[i].total += allocate;
			totalTroops.lancer -= allocate;

			console.log(`March ${i + 1} updated:`, marches[i]);
			console.log(`Remaining lancers: ${totalTroops.lancer}`);
		} else {
			console.log(`No more lancers to allocate (March ${i + 1})`);
			break;
		}
	}

	// ===== STEP 6: Allocate Remaining Infantry =====
	console.log("\n=== STEP 6: ALLOCATING REMAINING INFANTRY ===");
	console.log(`Remaining infantry to distribute: ${totalTroops.infantry}`);

	for (let i = 0; i < numMarches; i++) {
		if (totalTroops.infantry > 0) {
			console.log(`\nProcessing March ${i + 1}/${numMarches}`);
			const remainingCapacity = maxMarchSize - marches[i].total;
			console.log(`March has ${remainingCapacity} remaining capacity`);

			const allocate = Math.min(remainingCapacity, Math.floor(totalTroops.infantry/ numMarches));;
			console.log(`Allocating ${allocate} remaining infantry`);

			marches[i].infantry += allocate;
			marches[i].total += allocate;
			totalTroops.infantry -= allocate;

			console.log(`March ${i + 1} updated:`, marches[i]);
			console.log(`Remaining infantry: ${totalTroops.infantry}`);
		} else {
			console.log(`No more infantry to allocate (March ${i + 1})`);
			break;
		}
	}

	// ===== FINAL RESULTS =====
	console.log("\n=== FINAL RESULTS ===");
	console.log("Remaining troops after allocation:", JSON.stringify(totalTroops, null, 2));
	console.log("Final march compositions:");
	marches.forEach((march, index) => {
		const infantryPercent = ((march.infantry / march.total) * 100).toFixed(1);
		const lancerPercent = ((march.lancer / march.total) * 100).toFixed(1);
		const marksmanPercent = ((march.marksman / march.total) * 100).toFixed(1);

		console.log(`\nMarch ${index + 1}:`);
		console.log(`- Infantry: ${march.infantry} (${infantryPercent}%)`);
		console.log(`- Lancer: ${march.lancer} (${lancerPercent}%)`);
		console.log(`- Marksman: ${march.marksman} (${marksmanPercent}%)`);
		console.log(`- TOTAL: ${march.total}/${maxMarchSize}`);
	});

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