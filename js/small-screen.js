// Function to dynamically load the CSS file
function loadCSS(filename) {
	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.type = 'text/css';
	link.href = filename;
	document.head.appendChild(link);
}

// Function to detect small screens and show the popup
function checkScreenSize() {
	// Check if the screen width is less than 768px (common for tablets/phones)
	if (window.innerWidth < 768) {
		// Load the CSS dynamically
		loadCSS('/css/small-screen.css');

		// Create the popup HTML dynamically
		const popup = document.createElement('div');
		popup.id = 'small-screen-popup';
		popup.innerHTML = `
			<div class="popup-content">
				<h3>Notice: Small Screen Detected</h3>
				<p>
					This website is not optimized for mobile devices. You can try enabling "Desktop Mode" on Android, but for the best experience, please use a laptop or desktop.
				</p>
				<button onclick="closePopup()">OK</button>
			</div>
		`;

		// Append the popup to the body
		document.body.appendChild(popup);

		// Add styles for visibility
		document.getElementById('small-screen-popup').style.display = 'flex';
	}
}

// Function to close the popup
function closePopup() {
	const popup = document.getElementById('small-screen-popup');
	if (popup) {
		popup.style.display = 'none';
	}
}

// Trigger the check when the page loads
document.addEventListener('DOMContentLoaded', function () {
	checkScreenSize();
});
