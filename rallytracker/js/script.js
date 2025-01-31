let rallyTimeMode = "minutes";
let marchTimes = [];
let rallies = [];

document.addEventListener("DOMContentLoaded", function() {
    setInterval(updateRallyTimers, 1000);
    updatePlayerDropdown();
});

function addMarchTime() {
    let nameInput = document.getElementById("new-player-name").value.trim();
    let timeInput = parseInt(document.getElementById("new-player-time").value.trim());

    if (nameInput && !isNaN(timeInput)) {
        marchTimes.push({ name: nameInput, time: timeInput });
        document.getElementById("new-player-name").value = "";
        document.getElementById("new-player-time").value = "";
        updatePlayerDropdown();
        renderMarchTimes();
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
            ${isInRally ? "" : `<button onclick="deleteMarchTime(${index})" class="delete-btn">Delete</button>`}`;

        container.appendChild(div);
    });
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
    }
}

function renderRallies() {
    let container = document.getElementById("rallies");
    container.innerHTML = "";
    rallies.forEach((rally, index) => {
        let remainingLaunchTime = Math.max(0, Math.floor((rally.launchTime - Date.now()) / 1000));
        let remainingLandTime = Math.max(0, Math.floor((rally.launchTime + rally.marchTime * 1000 - Date.now()) / 1000));

        let launchMinutes = Math.floor(remainingLaunchTime / 60);
        let launchSeconds = remainingLaunchTime % 60;
        let landMinutes = Math.floor(remainingLandTime / 60);
        let landSeconds = remainingLandTime % 60;

        let div = document.createElement("div");
        div.className = "rally-entry";
        div.innerHTML = `<span>${rally.name}</span>
            <div>Launch: ${launchMinutes}m ${launchSeconds}s (${remainingLaunchTime}s total)</div>
            <div>Land: ${landMinutes}m ${landSeconds}s (${remainingLandTime}s total)</div>
            <button onclick="adjustLaunch(${index}, 1)">+1s</button>
            <button onclick="adjustLaunch(${index}, -1)">-1s</button>
            <button onclick="deleteRally(${index})">Delete</button>`;
        container.appendChild(div);
    });
}

function adjustLaunch(index, amount) {
    rallies[index].launchTime += amount * 1000;
    renderRallies();
}

function deleteRally(index) {
    rallies.splice(index, 1);
    renderRallies();
}

function updateRallyTimers() {
    renderRallies();
}

function toggleRallyTimeMode() {
    rallyTimeMode = rallyTimeMode === "minutes" ? "seconds" : "minutes";
    document.getElementById("time-mode-min-sec").style.display = rallyTimeMode === "minutes" ? "flex" : "none";
    document.getElementById("time-mode-seconds").style.display = rallyTimeMode === "seconds" ? "flex" : "none";
}


function editMarchTime(index) {
    let marchTimeSpan = document.getElementById(`march-time-${index}`);

    if (!marchTimeSpan) return;

    // Replace text with input field
    marchTimeSpan.innerHTML = `
        <input type="number" id="march-input-${index}" value="${marchTimes[index].time}" class="march-edit-input">
        <button onclick="saveMarchTime(${index})" class="save-btn">Save</button>
    `;

    // Focus input field
    document.getElementById(`march-input-${index}`).focus();
}

function deleteMarchTime(index) {
    marchTimes.splice(index, 1);
    renderMarchTimes();
    updatePlayerDropdown();
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
}
