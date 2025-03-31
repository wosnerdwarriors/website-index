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
	function distributeTroopsEvenly(troopType, totalAmount, numMarches) {
		debug(`[distributeTroopsEvenly] Distributing ${totalAmount} ${troopType} troops among ${numMarches} marches`);
		
		const baseAmount = Math.floor(totalAmount / numMarches);
		const remainder = totalAmount - (baseAmount * numMarches);
		
		debug(`[distributeTroopsEvenly] Base amount per march: ${baseAmount}, Remainder: ${remainder}`);
		
		const distribution = Array(numMarches).fill(baseAmount);
		
		// Distribute remainder one by one
		for (let i = 0; i < remainder; i++) {
			distribution[i]++;
		}
		
		debug(`[distributeTroopsEvenly] Final distribution: ${distribution.join(', ')}`);
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
		const totalTroops = {
			infantry: parseInt(document.getElementById('infantry_t11').value) || 0,
			lancer: parseInt(document.getElementById('lancer_t11').value) || 0,
			marksman: parseInt(document.getElementById('marksman_t11').value) || 0
		};
		
		debug(`[Total Troops Available] Infantry: ${totalTroops.infantry}, Lancer: ${totalTroops.lancer}, Marksman: ${totalTroops.marksman}`);

		// Calculate total available troops
		const totalAvailableTroops = totalTroops.infantry + totalTroops.lancer + totalTroops.marksman;
		debug(`[Total Available Troops] ${totalAvailableTroops}`);

		// Initialize marches array
		const marches = Array(numMarches).fill().map(() => ({
			infantry: 0,
			lancer: 0,
			marksman: 0,
			total: 0
		}));
		
		debug(`[Strategy] Using troop allocation algorithm that respects percentage constraints and even distribution`);
		
		// Calculate exact min/max troops per march for each type
		// These are the actual troop counts that correspond to the min/max percentages
		const exactInfantryMin = Math.floor(infantryMin / 100 * maxMarchSize);
		const exactInfantryMax = Math.floor(infantryMax / 100 * maxMarchSize);
		const exactLancerMin = Math.floor(lancerMin / 100 * maxMarchSize);
		const exactLancerMax = Math.floor(lancerMax / 100 * maxMarchSize);
		const exactMarksmanMin = Math.floor(marksmanMin / 100 * maxMarchSize);
		const exactMarksmanMax = Math.floor(marksmanMax / 100 * maxMarchSize);
		
		debug(`[Exact Troop Counts per March]`);
		debug(`  Infantry min: ${exactInfantryMin} (${infantryMin}%), max: ${exactInfantryMax} (${infantryMax}%)`);
		debug(`  Lancer min: ${exactLancerMin} (${lancerMin}%), max: ${exactLancerMax} (${lancerMax}%)`);
		debug(`  Marksman min: ${exactMarksmanMin} (${marksmanMin}%), max: ${exactMarksmanMax} (${marksmanMax}%)`);
		
		// Step 1: Calculate our target numbers based on percentage constraints and total troops
		debug(`[Step 1] Calculate target numbers based on percentage constraints and available troops`);
		
		// Calculate total min required for all marches
		const totalMinRequired = (exactInfantryMin + exactLancerMin + exactMarksmanMin) * numMarches;
		debug(`[Total Minimum Required] ${totalMinRequired} troops`);
		
		// Calculate how many troops to allocate for each type
		let plannedAllocation = {
			infantry: 0,
			lancer: 0,
			marksman: 0
		};
		
		// We need to handle the case where we don't have enough troops to meet all minimums
		if (totalAvailableTroops < totalMinRequired) {
			debug(`[WARNING] Not enough troops to meet all minimum percentage requirements`);
			
			// Calculate percentage distribution among minimums
			const totalMinPercent = infantryMin + lancerMin + marksmanMin;
			if (totalMinPercent <= 0) {
				// If no minimums are specified, distribute evenly
				debug(`[Fallback] No minimum percentages specified, distributing evenly among all types`);
				const perType = totalAvailableTroops / 3;
				plannedAllocation.infantry = Math.floor(perType);
				plannedAllocation.lancer = Math.floor(perType);
				plannedAllocation.marksman = Math.floor(perType);
				// Distribute remainder
				const remainder = totalAvailableTroops - (plannedAllocation.infantry + plannedAllocation.lancer + plannedAllocation.marksman);
				if (remainder > 0) plannedAllocation.infantry += remainder;
			} else {
				debug(`[Proportional Distribution] Allocating based on relative minimum percentages`);
				// Distribute proportionally based on min percentages
				plannedAllocation.infantry = Math.floor(totalAvailableTroops * (infantryMin / totalMinPercent));
				plannedAllocation.lancer = Math.floor(totalAvailableTroops * (lancerMin / totalMinPercent));
				plannedAllocation.marksman = Math.floor(totalAvailableTroops * (marksmanMin / totalMinPercent));
				// Distribute remainder
				const remainder = totalAvailableTroops - (plannedAllocation.infantry + plannedAllocation.lancer + plannedAllocation.marksman);
				if (remainder > 0) plannedAllocation.infantry += remainder;
			}
		} else {
			debug(`[Enough Troops] Allocating based on min requirements first, then distribute remainder`);
			
			// First allocate minimum required troops
			plannedAllocation.infantry = exactInfantryMin * numMarches;
			plannedAllocation.lancer = exactLancerMin * numMarches;
			plannedAllocation.marksman = exactMarksmanMin * numMarches;
			
			// Calculate remaining troops after min allocation
			let remainingTroops = {
				infantry: totalTroops.infantry - plannedAllocation.infantry,
				lancer: totalTroops.lancer - plannedAllocation.lancer,
				marksman: totalTroops.marksman - plannedAllocation.marksman,
			};
			
			// Calculate max allowed for each type after minimums
			const maxAllowedInfantry = (exactInfantryMax * numMarches) - plannedAllocation.infantry;
			const maxAllowedLancer = (exactLancerMax * numMarches) - plannedAllocation.lancer;
			const maxAllowedMarksman = (exactMarksmanMax * numMarches) - plannedAllocation.marksman;
			
			debug(`[Troops Remaining After Minimums] Infantry: ${remainingTroops.infantry}, Lancer: ${remainingTroops.lancer}, Marksman: ${remainingTroops.marksman}`);
			debug(`[Max Additional Allowed] Infantry: ${maxAllowedInfantry}, Lancer: ${maxAllowedLancer}, Marksman: ${maxAllowedMarksman}`);
			
			// Calculate how many more troops we can allocate for each type (limited by max allowed)
			const additionalInfantry = Math.min(remainingTroops.infantry, maxAllowedInfantry);
			const additionalLancer = Math.min(remainingTroops.lancer, maxAllowedLancer);
			const additionalMarksman = Math.min(remainingTroops.marksman, maxAllowedMarksman);
			
			debug(`[Additional Troops to Allocate] Infantry: ${additionalInfantry}, Lancer: ${additionalLancer}, Marksman: ${additionalMarksman}`);
			
			// Update planned allocation with additional troops
			plannedAllocation.infantry += additionalInfantry;
			plannedAllocation.lancer += additionalLancer;
			plannedAllocation.marksman += additionalMarksman;
			
			// There may still be troops left over if we hit max percentages
			remainingTroops.infantry -= additionalInfantry;
			remainingTroops.lancer -= additionalLancer;
			remainingTroops.marksman -= additionalMarksman;
			
			// If there are still troops left, try to fit them in any way possible
			const totalRemainingTroops = remainingTroops.infantry + remainingTroops.lancer + remainingTroops.marksman;
			
			if (totalRemainingTroops > 0) {
				debug(`[Overflow Troops] Still have ${totalRemainingTroops} troops left after allocation within percentage limits`);
				// We'll just add these to planned allocation, and the code below will try to fit them
				plannedAllocation.infantry += remainingTroops.infantry;
				plannedAllocation.lancer += remainingTroops.lancer;
				plannedAllocation.marksman += remainingTroops.marksman;
			}
		}
		
		debug(`[Planned Allocation] Infantry: ${plannedAllocation.infantry}, Lancer: ${plannedAllocation.lancer}, Marksman: ${plannedAllocation.marksman}`);
		debug(`[Planned Total] ${plannedAllocation.infantry + plannedAllocation.lancer + plannedAllocation.marksman} out of ${totalAvailableTroops}`);

		// Step 2: Distribute troops evenly
		debug(`[Step 2] Distribute planned allocation evenly across all marches`);
		
		// Distribute infantry evenly
		if (plannedAllocation.infantry > 0) {
			const infantryDistribution = distributeTroopsEvenly('infantry', plannedAllocation.infantry, numMarches);
			for (let i = 0; i < numMarches; i++) {
				marches[i].infantry = infantryDistribution[i];
				marches[i].total += infantryDistribution[i];
			}
		}
		
		// Distribute lancer evenly
		if (plannedAllocation.lancer > 0) {
			const lancerDistribution = distributeTroopsEvenly('lancer', plannedAllocation.lancer, numMarches);
			for (let i = 0; i < numMarches; i++) {
				marches[i].lancer = lancerDistribution[i];
				marches[i].total += lancerDistribution[i];
			}
		}
		
		// Distribute marksman evenly
		if (plannedAllocation.marksman > 0) {
			const marksmanDistribution = distributeTroopsEvenly('marksman', plannedAllocation.marksman, numMarches);
			for (let i = 0; i < numMarches; i++) {
				marches[i].marksman = marksmanDistribution[i];
				marches[i].total += marksmanDistribution[i];
			}
		}
		
		// Step 3: Check if we need to adjust to respect max march size
		debug(`[Step 3] Checking if any march exceeds max size (${maxMarchSize})`);
		
		let needsAdjustment = false;
		for (let i = 0; i < numMarches; i++) {
			if (marches[i].total > maxMarchSize) {
				needsAdjustment = true;
				debug(`[Adjustment Needed] March #${i+1} exceeds max size: ${marches[i].total} > ${maxMarchSize}`);
				break;
			}
		}
		
		// If any march exceeds max size, we need to redistribute
		if (needsAdjustment) {
			debug(`[Redistribution] Adjusting allocations to respect max march size`);
			
			// Reset marches and start over with a different strategy
			for (let i = 0; i < numMarches; i++) {
				marches[i].infantry = 0;
				marches[i].lancer = 0;
				marches[i].marksman = 0;
				marches[i].total = 0;
			}
			
			// Fill marches one by one respecting percentages and max size
			let remainingTroops = {
				infantry: totalTroops.infantry,
				lancer: totalTroops.lancer,
				marksman: totalTroops.marksman
			};
			
			for (let i = 0; i < numMarches && (remainingTroops.infantry > 0 || remainingTroops.lancer > 0 || remainingTroops.marksman > 0); i++) {
				debug(`[Filling March #${i+1}]`);
				
				// First, allocate minimum percentages
				const infantryMinForMarch = Math.floor(infantryMin / 100 * maxMarchSize);
				const lancerMinForMarch = Math.floor(lancerMin / 100 * maxMarchSize);
				const marksmanMinForMarch = Math.floor(marksmanMin / 100 * maxMarchSize);
				
				// Check if we have enough troops for minimums in this march
				const totalMinForMarch = infantryMinForMarch + lancerMinForMarch + marksmanMinForMarch;
				const totalRemaining = remainingTroops.infantry + remainingTroops.lancer + remainingTroops.marksman;
				
				if (totalRemaining >= totalMinForMarch) {
					// We have enough for minimums
					marches[i].infantry += Math.min(infantryMinForMarch, remainingTroops.infantry);
					remainingTroops.infantry -= marches[i].infantry;
					
					marches[i].lancer += Math.min(lancerMinForMarch, remainingTroops.lancer);
					remainingTroops.lancer -= marches[i].lancer;
					
					marches[i].marksman += Math.min(marksmanMinForMarch, remainingTroops.marksman);
					remainingTroops.marksman -= marches[i].marksman;
					
					marches[i].total = marches[i].infantry + marches[i].lancer + marches[i].marksman;
					
					debug(`[March #${i+1} after minimums] I:${marches[i].infantry}, L:${marches[i].lancer}, M:${marches[i].marksman}, Total:${marches[i].total}`);
					
					// Calculate space left and max allowed for each type
					const spaceLeft = maxMarchSize - marches[i].total;
					
					if (spaceLeft > 0 && (remainingTroops.infantry > 0 || remainingTroops.lancer > 0 || remainingTroops.marksman > 0)) {
						// Calculate how many more of each type we can add before hitting max percentage
						const infantryMaxForMarch = Math.floor(infantryMax / 100 * maxMarchSize);
						const lancerMaxForMarch = Math.floor(lancerMax / 100 * maxMarchSize);
						const marksmanMaxForMarch = Math.floor(marksmanMax / 100 * maxMarchSize);
						
						const infantrySpaceLeft = Math.max(0, infantryMaxForMarch - marches[i].infantry);
						const lancerSpaceLeft = Math.max(0, lancerMaxForMarch - marches[i].lancer);
						const marksmanSpaceLeft = Math.max(0, marksmanMaxForMarch - marches[i].marksman);
						
						debug(`[Space left for additional troops] I:${infantrySpaceLeft}, L:${lancerSpaceLeft}, M:${marksmanSpaceLeft}`);
						
						// Prioritize filling with marksman, then lancer, then infantry
						// This is just a heuristic; you can change the order if desired
						
						// Add marksman up to max
						const marksmanToAdd = Math.min(remainingTroops.marksman, marksmanSpaceLeft, spaceLeft);
						marches[i].marksman += marksmanToAdd;
						remainingTroops.marksman -= marksmanToAdd;
						marches[i].total += marksmanToAdd;
						
						// Add lancer up to max with remaining space
						const spaceLeftAfterMarksman = maxMarchSize - marches[i].total;
						const lancerToAdd = Math.min(remainingTroops.lancer, lancerSpaceLeft, spaceLeftAfterMarksman);
						marches[i].lancer += lancerToAdd;
						remainingTroops.lancer -= lancerToAdd;
						marches[i].total += lancerToAdd;
						
						// Add infantry with any remaining space
						const spaceLeftAfterLancer = maxMarchSize - marches[i].total;
						const infantryToAdd = Math.min(remainingTroops.infantry, infantrySpaceLeft, spaceLeftAfterLancer);
						marches[i].infantry += infantryToAdd;
						remainingTroops.infantry -= infantryToAdd;
						marches[i].total += infantryToAdd;
						
						debug(`[March #${i+1} final] I:${marches[i].infantry}, L:${marches[i].lancer}, M:${marches[i].marksman}, Total:${marches[i].total}`);
					}
				}
				else {
					// Not enough for minimums - distribute what we have proportionally
					debug(`[Not enough for minimums] Distributing proportionally`);
					
					const totalMinPercent = infantryMin + lancerMin + marksmanMin;
					
					if (totalMinPercent <= 0) {
						// If no minimums, distribute evenly
						const infantryToAdd = Math.floor(totalRemaining / 3);
						const lancerToAdd = Math.floor(totalRemaining / 3);
						const marksmanToAdd = totalRemaining - infantryToAdd - lancerToAdd;
						
						marches[i].infantry += Math.min(infantryToAdd, remainingTroops.infantry);
						remainingTroops.infantry -= marches[i].infantry;
						
						marches[i].lancer += Math.min(lancerToAdd, remainingTroops.lancer);
						remainingTroops.lancer -= marches[i].lancer;
						
						marches[i].marksman += Math.min(marksmanToAdd, remainingTroops.marksman);
						remainingTroops.marksman -= marches[i].marksman;
					}
					else {
						// Distribute proportionally based on min percentages
						const infantryPct = infantryMin / totalMinPercent;
						const lancerPct = lancerMin / totalMinPercent;
						const marksmanPct = marksmanMin / totalMinPercent;
						
						const infantryToAdd = Math.floor(totalRemaining * infantryPct);
						const lancerToAdd = Math.floor(totalRemaining * lancerPct);
						const marksmanToAdd = totalRemaining - infantryToAdd - lancerToAdd;
						
						marches[i].infantry += Math.min(infantryToAdd, remainingTroops.infantry);
						remainingTroops.infantry -= marches[i].infantry;
						
						marches[i].lancer += Math.min(lancerToAdd, remainingTroops.lancer);
						remainingTroops.lancer -= marches[i].lancer;
						
						marches[i].marksman += Math.min(marksmanToAdd, remainingTroops.marksman);
						remainingTroops.marksman -= marches[i].marksman;
					}
					
					marches[i].total = marches[i].infantry + marches[i].lancer + marches[i].marksman;
					debug(`[March #${i+1} after proportional distribution] I:${marches[i].infantry}, L:${marches[i].lancer}, M:${marches[i].marksman}, Total:${marches[i].total}`);
				}
			}
			
			// If we still have troops left and marches to fill, go through again
			// This handles the case where we couldn't fit all troops in one pass
			const totalRemainingAfterPass = remainingTroops.infantry + remainingTroops.lancer + remainingTroops.marksman;
			
			if (totalRemainingAfterPass > 0) {
				debug(`[Still have troops left] ${totalRemainingAfterPass} troops left after first pass`);
				
				// Try to distribute remaining troops evenly across marches that still have space
				const marchesWithSpace = [];
				for (let i = 0; i < numMarches; i++) {
					if (marches[i].total < maxMarchSize) {
						marchesWithSpace.push({
							index: i,
							spaceLeft: maxMarchSize - marches[i].total
						});
					}
				}
				
				// If we have marches with space
				if (marchesWithSpace.length > 0) {
					debug(`[Distributing remaining troops] ${totalRemainingAfterPass} troops among ${marchesWithSpace.length} marches with space`);
					
					// Distribute remaining infantry
					if (remainingTroops.infantry > 0) {
						debug(`[Distributing remaining infantry] ${remainingTroops.infantry} troops`);
						
						// Get marches that can take more infantry
						const eligibleMarches = marchesWithSpace.filter(march => {
							const infantryMaxForMarch = Math.floor(infantryMax / 100 * maxMarchSize);
							return marches[march.index].infantry < infantryMaxForMarch;
						});
						
						if (eligibleMarches.length > 0) {
							// Calculate how much we can add to each march
							const infantryToDistribute = Math.min(
								remainingTroops.infantry,
								eligibleMarches.reduce((sum, march) => {
									const infantryMaxForMarch = Math.floor(infantryMax / 100 * maxMarchSize);
									const canAdd = Math.min(
										march.spaceLeft,
										infantryMaxForMarch - marches[march.index].infantry
									);
									return sum + canAdd;
								}, 0)
							);
							
							// Get exact distribution
							const distribution = distributeTroopsEvenly('infantry', infantryToDistribute, eligibleMarches.length);
							
							// Apply distribution
							for (let i = 0; i < eligibleMarches.length; i++) {
								const marchIndex = eligibleMarches[i].index;
								const infantryMaxForMarch = Math.floor(infantryMax / 100 * maxMarchSize);
								const canAdd = Math.min(
									eligibleMarches[i].spaceLeft,
									infantryMaxForMarch - marches[marchIndex].infantry,
									distribution[i]
								);
								
								marches[marchIndex].infantry += canAdd;
								marches[marchIndex].total += canAdd;
								eligibleMarches[i].spaceLeft -= canAdd;
								remainingTroops.infantry -= canAdd;
							}
						}
					}
					
					// Distribute remaining lancer
					if (remainingTroops.lancer > 0) {
						debug(`[Distributing remaining lancer] ${remainingTroops.lancer} troops`);
						
						// Get marches that can take more lancer
						const eligibleMarches = marchesWithSpace.filter(march => {
							const lancerMaxForMarch = Math.floor(lancerMax / 100 * maxMarchSize);
							return marches[march.index].lancer < lancerMaxForMarch && march.spaceLeft > 0;
						});
						
						if (eligibleMarches.length > 0) {
							// Calculate how much we can add to each march
							const lancerToDistribute = Math.min(
								remainingTroops.lancer,
								eligibleMarches.reduce((sum, march) => {
									const lancerMaxForMarch = Math.floor(lancerMax / 100 * maxMarchSize);
									const canAdd = Math.min(
										march.spaceLeft,
										lancerMaxForMarch - marches[march.index].lancer
									);
									return sum + canAdd;
								}, 0)
							);
							
							// Get exact distribution
							const distribution = distributeTroopsEvenly('lancer', lancerToDistribute, eligibleMarches.length);
							
							// Apply distribution
							for (let i = 0; i < eligibleMarches.length; i++) {
								const marchIndex = eligibleMarches[i].index;
								const lancerMaxForMarch = Math.floor(lancerMax / 100 * maxMarchSize);
								const canAdd = Math.min(
									eligibleMarches[i].spaceLeft,
									lancerMaxForMarch - marches[marchIndex].lancer,
									distribution[i]
								);
								
								marches[marchIndex].lancer += canAdd;
								marches[marchIndex].total += canAdd;
								eligibleMarches[i].spaceLeft -= canAdd;
								remainingTroops.lancer -= canAdd;
							}
						}
					}
					
					// Distribute remaining marksman
					if (remainingTroops.marksman > 0) {
						debug(`[Distributing remaining marksman] ${remainingTroops.marksman} troops`);
						
						// Get marches that can take more marksman
						const eligibleMarches = marchesWithSpace.filter(march => {
							const marksmanMaxForMarch = Math.floor(marksmanMax / 100 * maxMarchSize);
							return marches[march.index].marksman < marksmanMaxForMarch && march.spaceLeft > 0;
						});
						
						if (eligibleMarches.length > 0) {
							// Calculate how much we can add to each march
							const marksmanToDistribute = Math.min(
								remainingTroops.marksman,
								eligibleMarches.reduce((sum, march) => {
									const marksmanMaxForMarch = Math.floor(marksmanMax / 100 * maxMarchSize);
									const canAdd = Math.min(
										march.spaceLeft,
										marksmanMaxForMarch - marches[march.index].marksman
									);
									return sum + canAdd;
								}, 0)
							);
							
							// Get exact distribution
							const distribution = distributeTroopsEvenly('marksman', marksmanToDistribute, eligibleMarches.length);
							
							// Apply distribution
							for (let i = 0; i < eligibleMarches.length; i++) {
								const marchIndex = eligibleMarches[i].index;
								const marksmanMaxForMarch = Math.floor(marksmanMax / 100 * maxMarchSize);
								const canAdd = Math.min(
									eligibleMarches[i].spaceLeft,
									marksmanMaxForMarch - marches[marchIndex].marksman,
									distribution[i]
								);
								
								marches[marchIndex].marksman += canAdd;
								marches[marchIndex].total += canAdd;
								eligibleMarches[i].spaceLeft -= canAdd;
								remainingTroops.marksman -= canAdd;
							}
						}
					}
					
					// Final pass - if we still have troops and space, ignore percentage constraints
					const finalRemaining = remainingTroops.infantry + remainingTroops.lancer + remainingTroops.marksman;
					if (finalRemaining > 0) {
						debug(`[Final pass] ${finalRemaining} troops left, ignoring percentage constraints`);
						
						// Refresh which marches have space
						const finalMarches = [];
						for (let i = 0; i < numMarches; i++) {
							if (marches[i].total < maxMarchSize) {
								finalMarches.push({
									index: i,
									spaceLeft: maxMarchSize - marches[i].total
								});
							}
						}
						
						if (finalMarches.length > 0) {
							// Prioritize marksman, then lancer, then infantry
							// Distribute marksman
							if (remainingTroops.marksman > 0) {
								const marksmanToDistribute = Math.min(
									remainingTroops.marksman,
									finalMarches.reduce((sum, march) => sum + march.spaceLeft, 0)
								);
								
								const distribution = distributeTroopsEvenly('marksman', marksmanToDistribute, finalMarches.length);
								
								for (let i = 0; i < finalMarches.length; i++) {
									const marchIndex = finalMarches[i].index;
									const canAdd = Math.min(
										finalMarches[i].spaceLeft,
										distribution[i]
									);
									
									marches[marchIndex].marksman += canAdd;
									marches[marchIndex].total += canAdd;
									finalMarches[i].spaceLeft -= canAdd;
									remainingTroops.marksman -= canAdd;
								}
							}
							
							// Distribute lancer
							if (remainingTroops.lancer > 0) {
								const lancerToDistribute = Math.min(
									remainingTroops.lancer,
									finalMarches.reduce((sum, march) => sum + march.spaceLeft, 0)
								);
								
								const distribution = distributeTroopsEvenly('lancer', lancerToDistribute, finalMarches.length);
								
								for (let i = 0; i < finalMarches.length; i++) {
									const marchIndex = finalMarches[i].index;
									const canAdd = Math.min(
										finalMarches[i].spaceLeft,
										distribution[i]
									);
									
									marches[marchIndex].lancer += canAdd;
									marches[marchIndex].total += canAdd;
									finalMarches[i].spaceLeft -= canAdd;
									remainingTroops.lancer -= canAdd;
								}
							}
							
							// Distribute infantry
							if (remainingTroops.infantry > 0) {
								const infantryToDistribute = Math.min(
									remainingTroops.infantry,
									finalMarches.reduce((sum, march) => sum + march.spaceLeft, 0)
								);
								
								const distribution = distributeTroopsEvenly('infantry', infantryToDistribute, finalMarches.length);
								
								for (let i = 0; i < finalMarches.length; i++) {
									const marchIndex = finalMarches[i].index;
									const canAdd = Math.min(
										finalMarches[i].spaceLeft,
										distribution[i]
									);
									
									marches[marchIndex].infantry += canAdd;
									marches[marchIndex].total += canAdd;
									finalMarches[i].spaceLeft -= canAdd;
									remainingTroops.infantry -= canAdd;
								}
							}
						}
					}
				}
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
		debug(`[Summary] Infantry: ${totalInfantry} out of ${totalTroops.infantry}`);
		debug(`[Summary] Lancer: ${totalLancer} out of ${totalTroops.lancer}`);
		debug(`[Summary] Marksman: ${totalMarksman} out of ${totalTroops.marksman}`);
		
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