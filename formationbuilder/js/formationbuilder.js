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
		const numMarches = parseInt(document.getElementById('num_marches').value) || 0;
		const maxMarchSize = parseInt(document.getElementById('max_march_size').value) || 0;

		const infantryMin = parseInt(document.getElementById('infantry_min').value) || 0;
		const lancerMax = parseInt(document.getElementById('lancer_max').value) || 0;
		const marksmanMax = parseInt(document.getElementById('marksman_max').value) || 0;

		let totalTroops = {
			infantry: parseInt(document.getElementById('infantry_t11').value) || 0,
			lancer: parseInt(document.getElementById('lancer_t11').value) || 0,
			marksman: parseInt(document.getElementById('marksman_t11').value) || 0
		};

		const marches = Array(numMarches).fill().map(() => ({
			infantry: 0,
			lancer: 0,
			marksman: 0,
			total: 0
		}));

		// Step 1: Fill Infantry Min
		const infantryMinTroops = Math.floor(infantryMin / 100 * maxMarchSize);
		for (let i = 0; i < numMarches; i++) {
			const allocate = Math.min(infantryMinTroops, totalTroops.infantry);
			marches[i].infantry += allocate;
			marches[i].total += allocate;
			totalTroops.infantry -= allocate;
		}

		// Step 2: Fill Lancer Max
		const lancerMaxTroops = Math.floor(lancerMax / 100 * maxMarchSize);
		for (let i = 0; i < numMarches; i++) {
			const allocate = Math.min(lancerMaxTroops, totalTroops.lancer);
			marches[i].lancer += allocate;
			marches[i].total += allocate;
			totalTroops.lancer -= allocate;
		}

		// Step 3: Fill Marksman Max
		const marksmanMaxTroops = Math.floor(marksmanMax / 100 * maxMarchSize);
		for (let i = 0; i < numMarches; i++) {
			const allocate = Math.min(marksmanMaxTroops, totalTroops.marksman);
			marches[i].marksman += allocate;
			marches[i].total += allocate;
			totalTroops.marksman -= allocate;
		}

		// Step 4: Allocate Remaining Marksman
		for (let i = 0; i < numMarches; i++) {
			if (totalTroops.marksman > 0) {
				const remainingCapacity = maxMarchSize - marches[i].total;
				const allocate = Math.min(remainingCapacity, totalTroops.marksman);
				marches[i].marksman += allocate;
				marches[i].total += allocate;
				totalTroops.marksman -= allocate;
			}
		}

		// Step 5: Allocate Remaining Lancer
		for (let i = 0; i < numMarches; i++) {
			if (totalTroops.lancer > 0) {
				const remainingCapacity = maxMarchSize - marches[i].total;
				const allocate = Math.min(remainingCapacity, totalTroops.lancer);
				marches[i].lancer += allocate;
				marches[i].total += allocate;
				totalTroops.lancer -= allocate;
			}
		}

		// Step 6: Allocate Remaining Infantry
		for (let i = 0; i < numMarches; i++) {
			if (totalTroops.infantry > 0) {
				const remainingCapacity = maxMarchSize - marches[i].total;
				const allocate = Math.min(remainingCapacity, totalTroops.infantry);
				marches[i].infantry += allocate;
				marches[i].total += allocate;
				totalTroops.infantry -= allocate;
			}
		}

		// Display the results in a table format
		const resultsDiv = document.getElementById('results');
		resultsDiv.innerHTML = '';

		// Create the table element
		const table = document.createElement('table');
		table.className = 'table table-bordered table-striped';

		// Create the table header
		const thead = document.createElement('thead');
		thead.innerHTML = `
			<tr>
				<th>March #</th>
				<th>Infantry</th>
				<th>Lancer</th>
				<th>Marksman</th>
				<th>Total</th>
				<th>% Infantry</th>
				<th>% Lancer</th>
				<th>% Marksman</th>
			</tr>
		`;
		table.appendChild(thead);

		// Create the table body
		const tbody = document.createElement('tbody');
		marches.forEach((march, index) => {
			const infantryPercent = ((march.infantry / march.total) * 100).toFixed(1);
			const lancerPercent = ((march.lancer / march.total) * 100).toFixed(1);
			const marksmanPercent = ((march.marksman / march.total) * 100).toFixed(1);

			const row = document.createElement('tr');
			row.innerHTML = `
				<td>${index + 1}</td>
				<td>${march.infantry}</td>
				<td>${march.lancer}</td>
				<td>${march.marksman}</td>
				<td>${march.total}</td>
				<td>${infantryPercent}%</td>
				<td>${lancerPercent}%</td>
				<td>${marksmanPercent}%</td>
			`;
			tbody.appendChild(row);
		});
		table.appendChild(tbody);
		resultsDiv.appendChild(table);
	});
});
