/**
 * Debug mode functionality for videos page
 */

(function() {
    // Debug state object
    const debugState = {
        active: false,
        layout: 'grid',
        categories: 'flat',
        videoDisplay: 'embed', 
        theme: 'default'
    };

    // DOM elements
    const debugToolbar = document.getElementById('debug-toolbar');
    const debugStyles = document.getElementById('debug-styles');
    
    // Form elements
    const layoutStyle = document.getElementById('layout-style');
    const categoryStyle = document.getElementById('category-style');
    const videoDisplay = document.getElementById('video-display');
    const colorTheme = document.getElementById('color-theme');
    const applyButton = document.getElementById('apply-changes');
    const generateUrlButton = document.getElementById('generate-url');
    const resetButton = document.getElementById('reset-debug');

    // Check URL parameters on page load
    function checkDebugMode() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Check if debug mode is enabled
        if (urlParams.get('debug') === 'true') {
            debugState.active = true;
            debugToolbar.classList.remove('hidden');
            
            // Apply URL parameters if they exist
            if (urlParams.get('layout')) {
                debugState.layout = urlParams.get('layout');
                layoutStyle.value = debugState.layout;
            }
            
            if (urlParams.get('categories')) {
                debugState.categories = urlParams.get('categories');
                categoryStyle.value = debugState.categories;
            }
            
            if (urlParams.get('video')) {
                debugState.videoDisplay = urlParams.get('video');
                videoDisplay.value = debugState.videoDisplay;
            }
            
            if (urlParams.get('theme')) {
                debugState.theme = urlParams.get('theme');
                colorTheme.value = debugState.theme;
            }
            
            // Apply settings
            applyDebugSettings();
        }
    }

    // Apply debug settings
    function applyDebugSettings() {
        if (!debugState.active) return;
        
        // Clear previous styles
        debugStyles.innerHTML = '';
        
        // Apply theme
        applyTheme();
        
        // Apply layout style
        applyLayout();
        
        // Apply category style
        applyCategories();
        
        // Store the current video display mode globally
        window.videoDisplayMode = debugState.videoDisplay;
        
        // Force reload videos with new display mode
        if (typeof reloadVideos === 'function') {
            setTimeout(reloadVideos, 100);
        }
    }

    // Apply theme changes
    function applyTheme() {
        let themeStyles = '';
        
        switch (debugState.theme) {
            case 'dark':
                themeStyles = `
                    <style>
                        body { background-color: #121212; color: #e0e0e0; }
                        #main-content { background-color: #121212; }
                        .video-card { background-color: #1e1e1e; border: 1px solid #333; }
                        .video-card h3 { color: #e0e0e0; }
                        .video-card p { color: #aaa; }
                        .category-badge { background-color: #2a2a2a; color: #7dd3fc; }
                        #video-search { background-color: #2a2a2a; color: #e0e0e0; border-color: #444; }
                        #search-button { color: #aaa; }
                        footer { border-color: #333; color: #888; }
                    </style>
                `;
                break;
                
            case 'high-contrast':
                themeStyles = `
                    <style>
                        body { background-color: #000; color: #fff; }
                        #main-content { background-color: #000; }
                        .video-card { background-color: #000; border: 2px solid #fff; }
                        .video-card h3 { color: #fff; font-weight: bold; }
                        .video-card p { color: #fff; }
                        .category-badge { background-color: #fff; color: #000; font-weight: bold; }
                        .category-filter { border: 2px solid #fff; }
                        .category-filter.active { background-color: #fff !important; color: #000 !important; }
                        #video-search { background-color: #000; color: #fff; border: 2px solid #fff; }
                    </style>
                `;
                break;
                
            case 'playful':
                themeStyles = `
                    <style>
                        body { background-color: #f0f4ff; }
                        .video-card { border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.1); border: none; overflow: hidden; }
                        .video-card:nth-child(3n+1) { background-color: #fff0f7; border-top: 5px solid #ec4899; }
                        .video-card:nth-child(3n+2) { background-color: #ecfdf5; border-top: 5px solid #10b981; }
                        .video-card:nth-child(3n+3) { background-color: #eff6ff; border-top: 5px solid #3b82f6; }
                        .category-filter { border-radius: 12px; font-weight: 600; padding: 8px 16px; font-size: 14px; }
                        .category-badge { border-radius: 12px; font-weight: 600; }
                        h1 { background: linear-gradient(90deg, #3b82f6, #8b5cf6, #d946ef); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                    </style>
                `;
                break;
                
            case 'minimal':
                themeStyles = `
                    <style>
                        body { background-color: #fff; color: #333; font-family: system-ui, sans-serif; }
                        h1 { font-weight: 300; letter-spacing: -1px; }
                        .video-card { box-shadow: none; border: 1px solid #eee; }
                        .category-filter { background-color: transparent !important; color: #555 !important; border: 1px solid #ddd; }
                        .category-filter.active { border-color: #000; color: #000 !important; font-weight: 500; }
                        .category-badge { background-color: transparent; border: 1px solid #ddd; }
                        #video-search { border: 1px solid #ddd; box-shadow: none; }
                    </style>
                `;
                break;
        }
        
        debugStyles.innerHTML += themeStyles;
    }

    // Apply layout changes
    function applyLayout() {
        const videosContainer = document.getElementById('videos-container');
        if (!videosContainer) return;
        
        let layoutStyles = '';
        
        // Reset classes first
        videosContainer.className = '';
        
        switch (debugState.layout) {
            case 'grid':
                // Default layout
                videosContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
                break;
                
            case 'masonry':
                videosContainer.className = 'columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6';
                layoutStyles = `
                    <style>
                        #videos-container .video-card { break-inside: avoid; display: inline-block; width: 100%; margin-bottom: 20px; }
                    </style>
                `;
                break;
                
            case 'carousel':
                videosContainer.className = 'flex overflow-x-auto snap-x snap-mandatory py-6 gap-4';
                layoutStyles = `
                    <style>
                        #videos-container::-webkit-scrollbar { height: 8px; }
                        #videos-container::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
                        #videos-container::-webkit-scrollbar-thumb { background: #888; border-radius: 10px; }
                        #videos-container::-webkit-scrollbar-thumb:hover { background: #555; }
                        #videos-container .video-card { flex: 0 0 auto; width: 300px; scroll-snap-align: start; }
                        @media (min-width: 768px) { #videos-container .video-card { width: 350px; } }
                    </style>
                `;
                break;
                
            case 'list':
                videosContainer.className = 'flex flex-col gap-4';
                layoutStyles = `
                    <style>
                        #videos-container .video-card { display: flex; flex-direction: column; }
                        @media (min-width: 768px) { 
                            #videos-container .video-card { flex-direction: row; align-items: center; }
                            #videos-container .video-card > div:first-child { width: 250px; flex-shrink: 0; }
                        }
                    </style>
                `;
                break;
                
            case 'magazine':
                videosContainer.className = 'grid grid-cols-12 gap-6';
                layoutStyles = `
                    <style>
                        #videos-container .video-card:nth-child(6n+1) { grid-column: span 12; display: flex; flex-direction: column; }
                        #videos-container .video-card:not(:nth-child(6n+1)) { grid-column: span 6; }
                        @media (min-width: 768px) { 
                            #videos-container .video-card:nth-child(6n+1) { grid-column: span 8; flex-direction: row; }
                            #videos-container .video-card:nth-child(6n+1) > div:first-child { width: 60%; }
                            #videos-container .video-card:nth-child(6n+1) > div:last-child { width: 40%; padding: 20px; }
                            #videos-container .video-card:not(:nth-child(6n+1)) { grid-column: span 4; }
                        }
                        @media (max-width: 767px) { 
                            #videos-container .video-card:not(:nth-child(6n+1)) { grid-column: span 12; }
                        }
                    </style>
                `;
                break;
        }
        
        debugStyles.innerHTML += layoutStyles;
    }

    // Apply category style changes
    function applyCategories() {
        const categoryFilters = document.getElementById('category-filters');
        if (!categoryFilters) return;
        
        let categoryStyles = '';
        
        switch (debugState.categories) {
            case 'flat':
                // Default style
                categoryFilters.className = 'flex flex-wrap justify-center gap-2 mb-8';
                break;
                
            case 'hierarchical':
                categoryFilters.className = 'flex flex-col items-center space-y-1 mb-8';
                categoryStyles = `
                    <style>
                        #category-filters .category-filter[data-category="all"] {
                            width: 200px;
                            margin-bottom: 10px;
                            position: relative;
                        }
                        #category-filters .category-filter[data-category="all"]::after {
                            content: '';
                            position: absolute;
                            bottom: -10px;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 1px;
                            height: 10px;
                            background-color: #ccc;
                        }
                        
                        /* Create subcategory containers */
                        #category-filters .subcategories {
                            display: flex;
                            flex-wrap: wrap;
                            justify-content: center;
                            gap: 8px;
                            margin-top: 5px;
                            margin-bottom: 15px;
                            position: relative;
                        }
                        #category-filters .subcategories::before {
                            content: '';
                            position: absolute;
                            top: -10px;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 100px;
                            height: 1px;
                            background-color: #ccc;
                        }
                    </style>
                `;
                break;
                
            case 'tabbed':
                categoryFilters.className = 'mb-8 border-b border-gray-300';
                categoryStyles = `
                    <style>
                        #category-filters .category-filter {
                            border-radius: 0;
                            border-top: 2px solid transparent;
                            border-left: 1px solid transparent;
                            border-right: 1px solid transparent;
                            margin-bottom: -1px;
                            padding: 8px 16px;
                        }
                        #category-filters .category-filter.active {
                            border-top: 2px solid #3b82f6;
                            border-left: 1px solid #e5e7eb;
                            border-right: 1px solid #e5e7eb;
                            border-bottom: 1px solid white;
                        }
                    </style>
                `;
                break;
                
            case 'dropdown':
                categoryFilters.className = 'relative mb-8 flex justify-center';
                categoryStyles = `
                    <style>
                        #category-filters::before {
                            content: 'Categories';
                            display: block;
                            margin-bottom: 5px;
                            font-weight: 500;
                        }
                        #category-filters .category-filter {
                            display: none;
                        }
                        #category-filters .category-filter.active {
                            display: block;
                            width: 200px;
                            text-align: left;
                            position: relative;
                            padding-right: 24px;
                        }
                        #category-filters .category-filter.active::after {
                            content: '▼';
                            position: absolute;
                            right: 10px;
                            top: 50%;
                            transform: translateY(-50%);
                            font-size: 10px;
                        }
                        #category-filters:hover .category-filter,
                        #category-filters:focus-within .category-filter {
                            display: block;
                            width: 200px;
                            text-align: left;
                        }
                        #category-filters:hover .category-filter.active::after,
                        #category-filters:focus-within .category-filter.active::after {
                            content: '▲';
                        }
                        #category-filters:hover,
                        #category-filters:focus-within {
                            background: white;
                            border-radius: 6px;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                            padding: 8px;
                            z-index: 20;
                        }
                    </style>
                `;
                break;
        }
        
        debugStyles.innerHTML += categoryStyles;
    }

    // Generate shareable URL with current settings
    function generateShareableUrl() {
        const url = new URL(window.location.href);
        url.searchParams.set('debug', 'true');
        url.searchParams.set('layout', debugState.layout);
        url.searchParams.set('categories', debugState.categories);
        url.searchParams.set('video', debugState.videoDisplay);
        url.searchParams.set('theme', debugState.theme);
        
        // Show the URL in a prompt for easy copying
        const shareUrl = url.toString();
        prompt('Copy this URL to share your current debug configuration:', shareUrl);
    }

    // Reset debug settings
    function resetDebugSettings() {
        // Reset form values
        layoutStyle.value = 'grid';
        categoryStyle.value = 'flat';
        videoDisplay.value = 'embed';
        colorTheme.value = 'default';
        
        // Update state
        debugState.layout = 'grid';
        debugState.categories = 'flat';
        debugState.videoDisplay = 'embed';
        debugState.theme = 'default';
        
        // Clear styles
        debugStyles.innerHTML = '';
        
        // Reload the page without parameters
        const url = new URL(window.location.href);
        url.searchParams.delete('layout');
        url.searchParams.delete('categories');
        url.searchParams.delete('video');
        url.searchParams.delete('theme');
        window.location.href = url.toString();
    }

    // Event listeners
    if (applyButton) {
        applyButton.addEventListener('click', function() {
            debugState.layout = layoutStyle.value;
            debugState.categories = categoryStyle.value;
            debugState.videoDisplay = videoDisplay.value;
            debugState.theme = colorTheme.value;
            applyDebugSettings();
        });
    }
    
    if (generateUrlButton) {
        generateUrlButton.addEventListener('click', generateShareableUrl);
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', resetDebugSettings);
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', checkDebugMode);
})();