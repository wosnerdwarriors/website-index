// Check if Google Tag Manager has already been initialized
if (!window.gtmLoaded && window.location.search.indexOf('notrack=true') === -1) {
    // Set a flag to ensure this script doesn't run multiple times
    window.gtmLoaded = true;

    // Google Tag Manager (noscript)
    (function() {
        var noscriptTag = document.createElement('noscript');
        var iframeTag = document.createElement('iframe');
        iframeTag.src = "https://www.googletagmanager.com/ns.html?id=GTM-54D8C3P6";
        iframeTag.height = "0";
        iframeTag.width = "0";
        iframeTag.style.display = "none";
        iframeTag.style.visibility = "hidden";
        noscriptTag.appendChild(iframeTag);
        document.body.insertBefore(noscriptTag, document.body.firstChild);
    })();

    // Google Tag Manager (script)
    (function(w, d, s, l, i) {
        w[l] = w[l] || [];
        w[l].push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
        var f = d.getElementsByTagName(s)[0],
            j = d.createElement(s),
            dl = l != 'dataLayer' ? '&l=' + l : '';
        j.async = true;
        j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
        f.parentNode.insertBefore(j, f);
    })(window, document, 'script', 'dataLayer', 'GTM-54D8C3P6');
}

