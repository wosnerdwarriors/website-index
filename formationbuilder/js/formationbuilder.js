document.addEventListener('DOMContentLoaded', function() {
	let characters = JSON.parse(localStorage.getItem('characters')) || {};
	let selectedCharacter = null;
	
	// Enable verbose logging for debugging
	const DEBUG = true;
	
	function debug(...args) {
		if (DEBUG) {
			console.log(...args);
		}
	}

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

	// Function to distribute troops evenly
	function distributeTroopsEvenly(totalAmount, numParts) {
		const baseAmount = Math.floor(totalAmount / numParts);
		const remainder = totalAmount - (baseAmount * numParts);
		
		const distribution = Array(numParts).fill(baseAmount);
		
		// Distribute remainder one by one
		for (let i = 0; i < remainder; i++) {
			distribution[i]++;
		}
		
		return distribution;
	}

	// Troop Allocation and March Generation
	document.getElementById('generate-btn').addEventListener('click', function() {
		debug("====================== FORMATION GENERATION STARTED ======================");
		
		const numMarches = parseInt(document.getElementById('num_marches').value) || 0;
		const maxMarchSize = parseInt(document.getElementById('max_march_size').value) || 0;

		// Get min/max percentages
		const infantryMin = parseInt(document.getElementById('infantry_min').value) || 0;
		const infantryMax = parseInt(document.getElementById('infantry_max').value) || 100;
		const lancerMin = parseInt(document.getElementById('lancer_min').value) || 0;
		const lancerMax = parseInt(document.getElementById('lancer_max').value) || 100;
		const marksmanMin = parseInt(document.getElementById('marksman_min').value) || 0;
		const marksmanMax = parseInt(document.getElementById('marksman_max').value) || 100;
		
		debug(`[Initial Settings] numMarches: ${numMarches}, maxMarchSize: ${maxMarchSize}`);
		debug(`[Percentage Constraints] Infantry: ${infantryMin}%-${infantryMax}%, Lancer: ${lancerMin}%-${lancerMax}%, Marksman: ${marksmanMin}%-${marksmanMax}%`);

		// Parse troop counts
		let availableTroops = {
			infantry: parseInt(document.getElementById('infantry_t11').value) || 0,
			lancer: parseInt(document.getElementById('lancer_t11').value) || 0,
			marksman: parseInt(document.getElementById('marksman_t11').value) || 0
		};
		
		const originalTroops = {...availableTroops}; // Make a copy for reporting
		
		debug(`[Total Troops Available] Infantry: ${availableTroops.infantry}, Lancer: ${availableTroops.lancer}, Marksman: ${availableTroops.marksman}`);

		// Calculate total available troops
		const totalAvailableTroops = availableTroops.infantry + availableTroops.lancer + availableTroops.marksman;
		debug(`[Total Available Troops] ${totalAvailableTroops}`);

		// Initialize marches array
		const marches = Array(numMarches).fill().map(() => ({
			infantry: 0,
			lancer: 0,
			marksman: 0,
			total: 0
		}));
		
		// PROPER ALGORITHM THAT RESPECTS PERCENTAGES
		
		// Step 1: Calculate target troop type percentages that respect constraints
		// If we can't satisfy all constraints due to min percentages adding up to >100%, 
		// we'll scale them proportionally
		
		debug(`[Step 1] Calculate target troop percentages`);
		
		let targetPercentages = {
			infantry: 0,
			lancer: 0,
			marksman: 0
		};
		
		const totalMinPercentage = infantryMin + lancerMin + marksmanMin;
		
		if (totalMinPercentage > 100) {
			// Scale down min percentages proportionally
			debug(`[Min Percentage Scaling] Total min percentage ${totalMinPercentage}% exceeds 100%, scaling down`);
			targetPercentages.infantry = infantryMin * (100 / totalMinPercentage);
			targetPercentages.lancer = lancerMin * (100 / totalMinPercentage);
			targetPercentages.marksman = marksmanMin * (100 / totalMinPercentage);
		} else {
			// Start with min percentages
			targetPercentages.infantry = infantryMin;
			targetPercentages.lancer = lancerMin;
			targetPercentages.marksman = marksmanMin;
			
			// Remaining percentage to allocate
			let remainingPercentage = 100 - totalMinPercentage;
			
			// Calculate max additional percentage we can allocate to each type
			const additionalInfantryMax = Math.min(infantryMax - infantryMin, 100 - totalMinPercentage);
			const additionalLancerMax = Math.min(lancerMax - lancerMin, 100 - totalMinPercentage);
			const additionalMarksmanMax = Math.min(marksmanMax - marksmanMin, 100 - totalMinPercentage);
			
			// Total additional percentage we could allocate
			const totalAdditionalPossible = additionalInfantryMax + additionalLancerMax + additionalMarksmanMax;
			
			// If we can allocate more than 100%, scale proportionally
			if (totalAdditionalPossible > 0) {
				// Distribute remaining percentage proportionally
				targetPercentages.infantry += (additionalInfantryMax / totalAdditionalPossible) * remainingPercentage;
				targetPercentages.lancer += (additionalLancerMax / totalAdditionalPossible) * remainingPercentage;
				targetPercentages.marksman += (additionalMarksmanMax / totalAdditionalPossible) * remainingPercentage;
			}
		}
		
		// Ensure percentages sum to 100%
		const totalPercentage = targetPercentages.infantry + targetPercentages.lancer + targetPercentages.marksman;
		if (Math.abs(totalPercentage - 100) > 0.01) {
			const scaleFactor = 100 / totalPercentage;
			targetPercentages.infantry *= scaleFactor;
			targetPercentages.lancer *= scaleFactor;
			targetPercentages.marksman *= scaleFactor;
		}
		
		debug(`[Target Percentages] Infantry: ${targetPercentages.infantry.toFixed(1)}%, Lancer: ${targetPercentages.lancer.toFixed(1)}%, Marksman: ${targetPercentages.marksman.toFixed(1)}%`);
		
		// Step 2: Calculate total troops per march based on available troops and march limits
		
		debug(`[Step 2] Calculate troop allocation per march`);
		
		// First, determine how many troops per march considering max size
		let troopsPerMarch = Math.min(maxMarchSize, Math.floor(totalAvailableTroops / numMarches));
		debug(`[Troops Per March] ${troopsPerMarch}`);
		
		// Calculate exact troop counts per march
		const targetInfantryPerMarch = Math.floor((targetPercentages.infantry / 100) * troopsPerMarch);
		const targetLancerPerMarch = Math.floor((targetPercentages.lancer / 100) * troopsPerMarch);
		const targetMarksmanPerMarch = troopsPerMarch - targetInfantryPerMarch - targetLancerPerMarch; // Ensure it adds up exactly
		
		debug(`[Target Counts Per March] Infantry: ${targetInfantryPerMarch}, Lancer: ${targetLancerPerMarch}, Marksman: ${targetMarksmanPerMarch}`);
		
		// Step 3: Check if we have enough troops of each type
		const totalInfantryNeeded = targetInfantryPerMarch * numMarches;
		const totalLancerNeeded = targetLancerPerMarch * numMarches;
		const totalMarksmanNeeded = targetMarksmanPerMarch * numMarches;
		
		debug(`[Total Needed] Infantry: ${totalInfantryNeeded}, Lancer: ${totalLancerNeeded}, Marksman: ${totalMarksmanNeeded}`);
		
		// Determine how many marches we can fully fill with the target percentages
		const marchesWithTargetPercentage = Math.min(
			Math.floor(availableTroops.infantry / targetInfantryPerMarch),
			Math.floor(availableTroops.lancer / targetLancerPerMarch),
			Math.floor(availableTroops.marksman / targetMarksmanPerMarch),
			numMarches
		);
		
		debug(`[Marches with target %] ${marchesWithTargetPercentage} out of ${numMarches}`);
		
		// Step 4: Fill marches evenly with target percentages as much as possible
		
		// We'll fill as many marches as we can with the target percentages
		let actualTroopsPerMarch = {
			infantry: targetInfantryPerMarch,
			lancer: targetLancerPerMarch,
			marksman: targetMarksmanPerMarch
		};
		
		// Fill full marches with target percentages
		for (let i = 0; i < marchesWithTargetPercentage; i++) {
			marches[i].infantry = actualTroopsPerMarch.infantry;
			marches[i].lancer = actualTroopsPerMarch.lancer;
			marches[i].marksman = actualTroopsPerMarch.marksman;
			marches[i].total = actualTroopsPerMarch.infantry + actualTroopsPerMarch.lancer + actualTroopsPerMarch.marksman;
			
			availableTroops.infantry -= actualTroopsPerMarch.infantry;
			availableTroops.lancer -= actualTroopsPerMarch.lancer;
			availableTroops.marksman -= actualTroopsPerMarch.marksman;
		}
		
		// Step 5: If we have marches left to fill and troops left, distribute evenly
		const remainingMarches = numMarches - marchesWithTargetPercentage;
		if (remainingMarches > 0) {
			debug(`[Step 5] Fill ${remainingMarches} remaining marches with available troops`);
			debug(`[Remaining Troops] Infantry: ${availableTroops.infantry}, Lancer: ${availableTroops.lancer}, Marksman: ${availableTroops.marksman}`);
			
			// If we have at least one troop type exhausted, we can't maintain the target percentages
			// We'll try to keep the ratios as close as possible by distributing evenly
			
			// Distribute remaining infantry evenly
			if (availableTroops.infantry > 0) {
				const infantryDistribution = distributeTroopsEvenly(availableTroops.infantry, remainingMarches);
				for (let i = 0; i < remainingMarches; i++) {
					marches[marchesWithTargetPercentage + i].infantry = infantryDistribution[i];
					marches[marchesWithTargetPercentage + i].total += infantryDistribution[i];
				}
				availableTroops.infantry = 0;
			}
			
			// Distribute remaining lancer evenly
			if (availableTroops.lancer > 0) {
				const lancerDistribution = distributeTroopsEvenly(availableTroops.lancer, remainingMarches);
				for (let i = 0; i < remainingMarches; i++) {
					marches[marchesWithTargetPercentage + i].lancer = lancerDistribution[i];
					marches[marchesWithTargetPercentage + i].total += lancerDistribution[i];
				}
				availableTroops.lancer = 0;
			}
			
			// Distribute remaining marksman evenly
			if (availableTroops.marksman > 0) {
				const marksmanDistribution = distributeTroopsEvenly(availableTroops.marksman, remainingMarches);
				for (let i = 0; i < remainingMarches; i++) {
					marches[marchesWithTargetPercentage + i].marksman = marksmanDistribution[i];
					marches[marchesWithTargetPercentage + i].total += marksmanDistribution[i];
				}
				availableTroops.marksman = 0;
			}
		}
		
		// Print final march composition for debugging
		debug(`[Final March Composition]`);
		marches.forEach((march, i) => {
			const infantryPercent = march.total > 0 ? ((march.infantry / march.total) * 100).toFixed(1) : "0.0";
			const lancerPercent = march.total > 0 ? ((march.lancer / march.total) * 100).toFixed(1) : "0.0";
			const marksmanPercent = march.total > 0 ? ((march.marksman / march.total) * 100).toFixed(1) : "0.0";
			
			debug(`March #${i+1}: I:${march.infantry} (${infantryPercent}%), L:${march.lancer} (${lancerPercent}%), M:${march.marksman} (${marksmanPercent}%), Total:${march.total}`);
		});
		
		// Summary statistics
		const totalInfantry = marches.reduce((sum, march) => sum + march.infantry, 0);
		const totalLancer = marches.reduce((sum, march) => sum + march.lancer, 0);
		const totalMarksman = marches.reduce((sum, march) => sum + march.marksman, 0);
		const totalTroopsUsed = totalInfantry + totalLancer + totalMarksman;
		
		debug(`[Summary] Total troops used: ${totalTroopsUsed} out of ${totalAvailableTroops}`);
		debug(`[Summary] Infantry: ${totalInfantry} out of ${originalTroops.infantry}`);
		debug(`[Summary] Lancer: ${totalLancer} out of ${originalTroops.lancer}`);
		debug(`[Summary] Marksman: ${totalMarksman} out of ${originalTroops.marksman}`);
		
		// Percentage stats across all marches combined
		const overallInfantryPercent = totalTroopsUsed > 0 ? ((totalInfantry / totalTroopsUsed) * 100).toFixed(1) : "0.0";
		const overallLancerPercent = totalTroopsUsed > 0 ? ((totalLancer / totalTroopsUsed) * 100).toFixed(1) : "0.0";
		const overallMarksmanPercent = totalTroopsUsed > 0 ? ((totalMarksman / totalTroopsUsed) * 100).toFixed(1) : "0.0";
		
		debug(`[Overall Percentages] Infantry: ${overallInfantryPercent}%, Lancer: ${overallLancerPercent}%, Marksman: ${overallMarksmanPercent}%`);
		debug(`[Target Percentages] Infantry: ${infantryMin}%-${infantryMax}%, Lancer: ${lancerMin}%-${lancerMax}%, Marksman: ${marksmanMin}%-${marksmanMax}%`);

		debug("====================== FORMATION GENERATION COMPLETED ======================");

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
			const infantryPercent = march.total > 0 ? ((march.infantry / march.total) * 100).toFixed(1) : "0.0";
			const lancerPercent = march.total > 0 ? ((march.lancer / march.total) * 100).toFixed(1) : "0.0";
			const marksmanPercent = march.total > 0 ? ((march.marksman / march.total) * 100).toFixed(1) : "0.0";

			const row = document.createElement('tr');
			row.innerHTML = `
				<td class="border px-4 py-2">${index + 1}</td>
				<td class="border px-4 py-2">${march.infantry.toLocaleString()}</td>
				<td class="border px-4 py-2">${march.lancer.toLocaleString()}</td>
				<td class="border px-4 py-2">${march.marksman.toLocaleString()}</td>
				<td class="border px-4 py-2">${march.total.toLocaleString()}</td>
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
			const infantryPercent = march.total > 0 ? ((march.infantry / march.total) * 100).toFixed(1) : "0.0";
			const lancerPercent = march.total > 0 ? ((march.lancer / march.total) * 100).toFixed(1) : "0.0";
			const marksmanPercent = march.total > 0 ? ((march.marksman / march.total) * 100).toFixed(1) : "0.0";
			
			const card = document.createElement('div');
			card.className = 'bg-gray-50 p-4 rounded border border-gray-200 mb-4';
			
			card.innerHTML = `
				<h3 class="font-bold text-lg mb-2">March #${index + 1}</h3>
				<div class="flex flex-col space-y-2 mb-3">
					<div class="bg-white p-2 rounded border border-gray-200 flex justify-between items-center">
						<span class="font-medium">Total:</span>
						<span class="font-bold">${march.total.toLocaleString()}</span>
					</div>
					<div class="bg-blue-50 p-2 rounded border border-blue-200 flex justify-between items-center">
						<span class="font-medium text-blue-800">Infantry:</span>
						<span>
							<span class="font-bold">${march.infantry.toLocaleString()}</span>
							<span class="text-sm text-gray-600 ml-2">(${infantryPercent}%)</span>
						</span>
					</div>
					<div class="bg-green-50 p-2 rounded border border-green-200 flex justify-between items-center">
						<span class="font-medium text-green-800">Lancer:</span>
						<span>
							<span class="font-bold">${march.lancer.toLocaleString()}</span>
							<span class="text-sm text-gray-600 ml-2">(${lancerPercent}%)</span>
						</span>
					</div>
					<div class="bg-red-50 p-2 rounded border border-red-200 flex justify-between items-center">
						<span class="font-medium text-red-800">Marksman:</span>
						<span>
							<span class="font-bold">${march.marksman.toLocaleString()}</span>
							<span class="text-sm text-gray-600 ml-2">(${marksmanPercent}%)</span>
						</span>
					</div>
				</div>
			`;
			
			cardView.appendChild(card);
		});
		viewsContainer.appendChild(cardView);
		
		// Add summary row for overall percentages
		const summaryDiv = document.createElement('div');
		summaryDiv.className = 'bg-gray-100 p-4 rounded border border-gray-300 mt-4';
		summaryDiv.innerHTML = `
			<h3 class="font-bold text-lg mb-2">Overall Distribution</h3>
			<div class="grid grid-cols-3 gap-2">
				<div class="bg-blue-50 p-2 rounded border border-blue-200 text-center">
					<div class="font-medium text-blue-800">Infantry</div>
					<div>${totalInfantry.toLocaleString()} (${overallInfantryPercent}%)</div>
				</div>
				<div class="bg-green-50 p-2 rounded border border-green-200 text-center">
					<div class="font-medium text-green-800">Lancer</div>
					<div>${totalLancer.toLocaleString()} (${overallLancerPercent}%)</div>
				</div>
				<div class="bg-red-50 p-2 rounded border border-red-200 text-center">
					<div class="font-medium text-red-800">Marksman</div>
					<div>${totalMarksman.toLocaleString()} (${overallMarksmanPercent}%)</div>
				</div>
			</div>
			<div class="mt-2 text-sm text-gray-600">
				<div>Target Infantry: ${infantryMin}%-${infantryMax}%</div>
				<div>Target Lancer: ${lancerMin}%-${lancerMax}%</div>
				<div>Target Marksman: ${marksmanMin}%-${marksmanMax}%</div>
			</div>
		`;
		viewsContainer.appendChild(summaryDiv);
		
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