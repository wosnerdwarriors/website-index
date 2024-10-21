// Function to check if "notrack" exists in the URL parameters
function shouldTrack() {
    const urlParams = new URLSearchParams(window.location.search);
    return !urlParams.has('notrack'); // Returns true if notrack is not present
}

// Only run Google Tag Manager if "notrack" is not set
if (shouldTrack()) {
    // Google Tag Manager (noscript)
    const noscriptTag = document.createElement('noscript');
    noscriptTag.innerHTML = '<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-54D8C3P6" height="0" width="0" style="display:none;visibility:hidden"></iframe>';
    document.body.appendChild(noscriptTag);

    // Google Tag Manager (script)
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-54D8C3P6');
}

