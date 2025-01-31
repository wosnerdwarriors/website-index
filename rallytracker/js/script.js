let rallyTimeMode = "minutes";
let marchTimes = [];
let rallies = [];

// Load data from cache when the page loads
document.addEventListener("DOMContentLoaded", function () {
    loadFromCache();
    setInterval(updateRallyTimers, 1000);
    updatePlayerDropdown();
});

// Save to localStorage
function saveToCache() {
    localStorage.setItem("marchTimes", JSON.stringify(marchTimes));
    localStorage.setItem("rallies", JSON.stringify(rallies));
}

// Load from localStorage
function loadFromCache() {
    let savedMarchTimes = localStorage.getItem("marchTimes");
    let savedRallies = localStorage.getItem("rallies");

    if (savedMarchTimes) {
        marchTimes = JSON.parse(savedMarchTimes);
    }
    if (savedRallies) {
        rallies = JSON.parse(savedRallies);
    }

    renderMarchTimes();
    renderRallies();
}

function addMarchTime() {
    let nameInput = document.getElementById("new-player-name").value.trim();
    let timeInput = parseInt(document.getElementById("new-player-time").value.trim());

    if (nameInput && !isNaN(timeInput)) {
        marchTimes.push({ name: nameInput, time: timeInput });
        document.getElementById("new-player-name").value = "";
        document.getElementById("new-player-time").value = "";
        updatePlayerDropdown();
        renderMarchTimes();
        saveToCache();
    }
}

function updatePlayerDropdown() {
    let dropdown = document.getElementById("rally-starter");
    dropdown.innerHTML = "";
    marchTimes.forEach(player => {
        let option = document.createElement("option");
        option.value = player.name;
        option.textContent = `${player.name} (${player.time}s)`;
        dropdown.appendChild(option);
    });
}

function renderMarchTimes() {
    let container = document.getElementById("march-times");
    container.innerHTML = "";
    
    marchTimes.forEach((entry, index) => {
        let isInRally = rallies.some(r => r.name === entry.name);

        let div = document.createElement("div");
        div.className = "march-entry";
        div.innerHTML = `<span>${entry.name}: <span id="march-time-${index}">${entry.time}s</span></span>
            <button onclick="editMarchTime(${index})" class="edit-btn">Edit</button>
            <button onclick="adjustMarchTime(${index}, 1)">+1s</button>
            <button onclick="adjustMarchTime(${index}, -1)">-1s</button>
            ${isInRally 
                ? `<button disabled class="delete-btn disabled-btn" title="Cannot delete: Used in a rally">Delete</button>`
                : `<button onclick="deleteMarchTime(${index})" class="delete-btn">Delete</button>`}`;

        container.appendChild(div);
    });
}


function editMarchTime(index) {
    let marchTimeSpan = document.getElementById(`march-time-${index}`);

    if (!marchTimeSpan) return;

    marchTimeSpan.innerHTML = `
        <input type="number" id="march-input-${index}" value="${marchTimes[index].time}" class="march-edit-input">
        <button onclick="saveMarchTime(${index})" class="save-btn">Save</button>
    `;

    document.getElementById(`march-input-${index}`).focus();
}

function saveMarchTime(index) {
    let inputField = document.getElementById(`march-input-${index}`);
    let newTime = parseInt(inputField.value);

    if (!isNaN(newTime) && newTime > 0) {
        let oldName = marchTimes[index].name;
        marchTimes[index].time = newTime;

        // Update any ongoing rallies using this player
        rallies.forEach(rally => {
            if (rally.name === oldName) {
                rally.marchTime = newTime;
            }
        });

        updatePlayerDropdown();
        renderMarchTimes();
        renderRallies();
        saveToCache();
    }
}

function adjustMarchTime(index, amount) {
    let newTime = Math.max(1, marchTimes[index].time + amount);
    let oldName = marchTimes[index].name;
    marchTimes[index].time = newTime;

    // Update any ongoing rallies using this player
    rallies.forEach(rally => {
        if (rally.name === oldName) {
            rally.marchTime = newTime;
        }
    });

    updatePlayerDropdown();
    renderMarchTimes();
    renderRallies();
    saveToCache();
}

function addRally() {
    let selectedPlayer = document.getElementById("rally-starter").value;
    let player = marchTimes.find(p => p.name === selectedPlayer);
    let rallyDuration = rallyTimeMode === "minutes"
        ? parseInt(document.getElementById("new-rally-minutes").value) * 60 + parseInt(document.getElementById("new-rally-seconds").value)
        : parseInt(document.getElementById("new-rally-total-seconds").value);

    if (player && !isNaN(rallyDuration)) {
        rallies.push({
            name: player.name,
            marchTime: player.time,
            launchTime: Date.now() + rallyDuration * 1000
        });

        renderRallies();
        renderMarchTimes(); // <-- Immediately update delete button state
        saveToCache();
    }
}


function renderRallies() {
    let container = document.getElementById("rallies");
    container.innerHTML = "";

    if (rallies.length === 0) return;

    let soonestRallyIndex = -1;
    let soonestTime = Infinity;

    // Find the rally that will land next (ignoring landed ones)
    rallies.forEach((rally, index) => {
        let remainingLandTime = rally.launchTime + rally.marchTime * 1000 - Date.now();
        if (remainingLandTime > 0 && remainingLandTime < soonestTime) {
            soonestRallyIndex = index;
            soonestTime = remainingLandTime;
        }
    });

    rallies.forEach((rally, index) => {
        let remainingLaunchTime = Math.max(0, Math.floor((rally.launchTime - Date.now()) / 1000));
        let remainingLandTime = Math.max(0, Math.floor((rally.launchTime + rally.marchTime * 1000 - Date.now()) / 1000));

        let launchMinutes = Math.floor(remainingLaunchTime / 60);
        let launchSeconds = remainingLaunchTime % 60;
        let landMinutes = Math.floor(remainingLandTime / 60);
        let landSeconds = remainingLandTime % 60;

        let div = document.createElement("div");
        div.className = "rally-entry";

        // Highlight logic
        if (remainingLandTime <= 0) {
            div.style.backgroundColor = "#ffcccc"; // Red for landed rallies
        } else if (index === soonestRallyIndex) {
            div.style.backgroundColor = "#ccffcc"; // Green for next rally to land
        }

        div.innerHTML = `
            <div><strong>${rally.name}</strong></div> <!-- Show rally starter name -->
            <div style="display: flex; justify-content: space-between; width: 100%;">
                <div>
                    <strong>Launch:</strong> ${launchMinutes}m ${launchSeconds}s (${remainingLaunchTime}s)
                </div>
                <div>
                    <strong>Land:</strong> ${landMinutes}m ${landSeconds}s (${remainingLandTime}s)
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 5px; align-items: center;">
                <div>
                    <button onclick="adjustLaunch(${index}, -1)" style="margin-right: 2px;">-1s</button>
                    <button onclick="adjustLaunch(${index}, 1)">+1s</button>
                </div>
                <button onclick="deleteRally(${index})">Delete</button>
            </div>
        `;

        container.appendChild(div);
    });
}



function adjustLaunch(index, amount) {
    rallies[index].launchTime += amount * 1000;
    renderRallies();
    saveToCache();
}

function deleteRally(index) {
    let rallyName = rallies[index].name;
    rallies.splice(index, 1);

    // Check if this was the last rally using that march time
    if (!rallies.some(rally => rally.name === rallyName)) {
        renderMarchTimes(); // <-- Re-enable delete button if march is no longer used
    }

    renderRallies();
    saveToCache();
}

function updateRallyTimers() {
    renderRallies();
}

function toggleRallyTimeMode() {
    rallyTimeMode = rallyTimeMode === "minutes" ? "seconds" : "minutes";
    document.getElementById("time-mode-min-sec").style.display = rallyTimeMode === "minutes" ? "flex" : "none";
    document.getElementById("time-mode-seconds").style.display = rallyTimeMode === "seconds" ? "flex" : "none";
}

function deleteMarchTime(index) {
    marchTimes.splice(index, 1);

    // Remove any rallies that were using this player
    rallies = rallies.filter(rally => rally.name !== marchTimes[index]?.name);

    renderMarchTimes();
    renderRallies();
    updatePlayerDropdown();
    saveToCache();
}
function clearAllData() {
    if (confirm("Are you sure you want to delete all data? This cannot be undone.")) {
        marchTimes = [];
        rallies = [];
        localStorage.clear();
        renderMarchTimes();
        renderRallies();
        updatePlayerDropdown();
    }
}
