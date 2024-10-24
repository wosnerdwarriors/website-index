(function() {
	// Function to load external HTML
	function loadHTML(file, callback) {
		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4 && xhr.status === 200) {
				callback(xhr.responseText);
			}
		};
		xhr.open("GET", file, true);
		xhr.send();
	}

	// Function to load external CSS and call a callback when it's loaded
	function loadCSS(href, callback) {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = href;
		link.onload = callback;
		document.head.appendChild(link);
	}

	// Inject navbar container at the start of the body
	const body = document.body;
	const navbarDiv = document.createElement('div');
	navbarDiv.id = 'wosnerds-navbar';
	body.insertBefore(navbarDiv, body.firstChild);

	// Load navbar CSS first, then load the HTML content
	loadCSS("/css/navbar.css", function() {
		loadHTML("/navbar.html", function(data) {
			document.getElementById('wosnerds-navbar').innerHTML = data;
		});
	});
})();
