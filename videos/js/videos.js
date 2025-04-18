/**
 * Videos page script
 */

(function() {
    // Video data
    let videoData = [];
    let filteredVideos = [];
    let categories = new Set();
    
    // DOM Elements
    const videosContainer = document.getElementById('videos-container');
    const categoryFilters = document.getElementById('category-filters');
    const searchInput = document.getElementById('video-search');
    const searchButton = document.getElementById('search-button');
    const noResults = document.getElementById('no-results');
    
    // Get data source URL from config
    async function getDataSourceUrl() {
        try {
            const configResponse = await fetch('/config.json');
            if (configResponse.ok) {
                const config = await configResponse.json();
                if (config.dataSources && config.dataSources.videos) {
                    return config.dataSources.videos.url;
                }
            }
        } catch (error) {
            console.warn('Error loading config.json, falling back to local data', error);
        }
        // Fallback to local data if config fails
        return '/videos/videos-data.json';
    }
    
    // Fetch videos data
    async function fetchVideos() {
        try {
            const dataUrl = await getDataSourceUrl();
            console.log('Fetching videos from:', dataUrl);
            
            const response = await fetch(dataUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch videos data');
            }
            videoData = await response.json();
            
            // Make videoData globally available for debug mode
            window.videoData = videoData;
            
            // Extract all unique categories
            videoData.forEach(video => {
                if (video.categories && Array.isArray(video.categories)) {
                    video.categories.forEach(category => categories.add(category));
                }
            });
            
            // Create category filter buttons
            createCategoryFilters();
            
            // Initialize with all videos
            filteredVideos = [...videoData];
            renderVideos(filteredVideos);
        } catch (error) {
            console.error('Error fetching videos:', error);
            videosContainer.innerHTML = `
                <div class="col-span-full text-center py-8 text-red-500">
                    <p class="text-xl">Error loading videos data</p>
                    <p class="text-gray-500 mt-2">Please try again later</p>
                </div>
            `;
            
            // Try to load local fallback data if remote fails
            try {
                // Get fallback path from config if possible
                let fallbackPath = '/videos/videos-data.json';
                try {
                    const configResponse = await fetch('/config.json');
                    if (configResponse.ok) {
                        const config = await configResponse.json();
                        if (config.dataSources?.videos?.fallbackPath) {
                            fallbackPath = config.dataSources.videos.fallbackPath;
                        }
                    }
                } catch (configError) {
                    console.warn('Could not load config for fallback path', configError);
                }
                
                console.log('Attempting to load fallback data from:', fallbackPath);
                const fallbackResponse = await fetch(fallbackPath);
                if (fallbackResponse.ok) {
                    console.log('Using fallback data');
                    videoData = await fallbackResponse.json();
                    window.videoData = videoData;
                    
                    // Clear and rebuild categories
                    categories.clear();
                    videoData.forEach(video => {
                        if (video.categories && Array.isArray(video.categories)) {
                            video.categories.forEach(category => categories.add(category));
                        }
                    });
                    
                    // Recreate UI
                    createCategoryFilters();
                    filteredVideos = [...videoData];
                    renderVideos(filteredVideos);
                }
            } catch (fallbackError) {
                console.error('Even fallback data failed to load', fallbackError);
            }
        }
    }
    
    // Create category filter buttons
    function createCategoryFilters() {
        const sortedCategories = Array.from(categories).sort();
        
        // Add event listener to the 'All Videos' button
        const allButton = document.querySelector('.category-filter[data-category="all"]');
        if (allButton) {
            allButton.addEventListener('click', () => filterByCategory('all'));
        }
        
        sortedCategories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'category-filter bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded-full text-sm';
            button.textContent = category;
            button.dataset.category = category;
            button.addEventListener('click', () => filterByCategory(category));
            categoryFilters.appendChild(button);
        });
    }
    
    // Filter videos by category
    function filterByCategory(category) {
        // Update active button styling
        document.querySelectorAll('.category-filter').forEach(btn => {
            btn.classList.remove('active', 'bg-blue-500', 'hover:bg-blue-600', 'text-white');
            btn.classList.add('bg-gray-200', 'hover:bg-gray-300', 'text-gray-800');
        });
        
        const activeButton = document.querySelector(`.category-filter[data-category="${category}"]`);
        if (activeButton) {
            activeButton.classList.add('active', 'bg-blue-500', 'hover:bg-blue-600', 'text-white');
            activeButton.classList.remove('bg-gray-200', 'hover:bg-gray-300', 'text-gray-800');
        }
        
        // Filter videos by category
        if (category === 'all') {
            filteredVideos = [...videoData];
        } else {
            filteredVideos = videoData.filter(video => 
                video.categories && video.categories.includes(category)
            );
        }
        
        // Apply any existing search filter
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (searchTerm) {
            filteredVideos = filteredVideos.filter(video => 
                video.title.toLowerCase().includes(searchTerm) || 
                (video.description && video.description.toLowerCase().includes(searchTerm))
            );
        }
        
        renderVideos(filteredVideos);
    }
    
    // Handle search
    function handleSearch() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        
        if (searchTerm) {
            filteredVideos = videoData.filter(video => {
                return video.title.toLowerCase().includes(searchTerm) || 
                       (video.description && video.description.toLowerCase().includes(searchTerm));
            });
            
            // If a category is selected, further filter by category
            const activeCategory = document.querySelector('.category-filter.active');
            if (activeCategory && activeCategory.dataset.category !== 'all') {
                const category = activeCategory.dataset.category;
                filteredVideos = filteredVideos.filter(video => 
                    video.categories && video.categories.includes(category)
                );
            }
        } else {
            // If no search term, reset to current category filter
            const activeCategory = document.querySelector('.category-filter.active');
            if (activeCategory) {
                filterByCategory(activeCategory.dataset.category);
                return;
            } else {
                filteredVideos = [...videoData];
            }
        }
        
        renderVideos(filteredVideos);
    }
    
    // Render videos to the page
    function renderVideos(videos) {
        // Clear loading spinner
        videosContainer.innerHTML = '';
        
        if (videos.length === 0) {
            noResults.classList.remove('hidden');
        } else {
            noResults.classList.add('hidden');
            
            // Check for fullwidth mode before rendering
            if (window.videoDisplayMode === 'fullwidth') {
                // Create a wrapper for non-featured videos
                const otherVideos = document.createElement('div');
                otherVideos.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-8';
                
                // Add featured video first
                if (videos.length > 0) {
                    const featuredVideo = createVideoCard(videos[0]);
                    featuredVideo.classList.add('featured-video', 'mb-8');
                    videosContainer.appendChild(featuredVideo);
                    
                    // Add style to make it stand out
                    const style = document.createElement('style');
                    style.textContent = `
                        .featured-video {
                            width: 100%;
                            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                            border-radius: 8px;
                        }
                        @media (min-width: 768px) {
                            .featured-video {
                                display: flex;
                                flex-direction: row;
                                background: linear-gradient(90deg, rgba(59, 130, 246, 0.05), transparent);
                            }
                            .featured-video > div:first-child {
                                width: 60%;
                            }
                            .featured-video > div:last-child {
                                width: 40%;
                                padding: 1rem;
                            }
                            .featured-video h3 {
                                font-size: 1.5rem;
                                line-height: 2rem;
                            }
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                // Add remaining videos to the grid
                videos.slice(1).forEach(video => {
                    const videoCard = createVideoCard(video);
                    otherVideos.appendChild(videoCard);
                });
                
                videosContainer.appendChild(otherVideos);
            } else {
                // Standard rendering
                videos.forEach(video => {
                    const videoCard = createVideoCard(video);
                    videosContainer.appendChild(videoCard);
                });
            }
        }
    }
    
    // Function to reload videos with current filters (for debug mode)
    function reloadVideos() {
        // Re-apply current filters to refresh the display
        const activeCategory = document.querySelector('.category-filter.active');
        if (activeCategory) {
            filterByCategory(activeCategory.dataset.category);
        } else {
            renderVideos(filteredVideos);
        }
    }
    
    // Create a video card element
    function createVideoCard(video) {
        const card = document.createElement('div');
        card.className = 'video-card bg-white rounded-lg shadow-md overflow-hidden';
        
        // Create video thumbnail with play button overlay
        const thumbnailWrapper = document.createElement('div');
        thumbnailWrapper.className = 'relative';
        
        // Create the thumbnail/video container
        const thumbnail = document.createElement('div');
        thumbnail.className = 'aspect-video bg-black';
        
        // Create the video embed
        if (video.embedUrl) {
            // For YouTube videos
            if (video.embedUrl.includes('youtube.com') || video.embedUrl.includes('youtu.be')) {
                const videoId = getYoutubeVideoId(video.embedUrl);
                if (videoId) {
                    // Always start with the thumbnail
                    thumbnail.innerHTML = `
                        <img src="https://i.ytimg.com/vi/${videoId}/mqdefault.jpg" 
                            alt="${video.title}" 
                            class="w-full h-full object-cover cursor-pointer">
                        <div class="absolute inset-0 flex items-center justify-center">
                            <div class="w-16 h-12 bg-red-600 rounded-lg flex items-center justify-center cursor-pointer">
                                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"></path>
                                </svg>
                            </div>
                        </div>
                    `;
                    
                    // But handle the click differently based on mode
                    if (window.videoDisplayMode === 'embed') {
                        // Convert to embedded player when clicked
                        thumbnail.addEventListener('click', (e) => {
                            e.preventDefault();
                            
                            // First, pause any other playing videos
                            pauseAllVideos();
                            
                            // Replace the thumbnail with actual embedded player
                            thumbnail.innerHTML = `
                                <iframe 
                                    class="youtube-embed w-full h-full border-0"
                                    src="https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1" 
                                    title="${video.title}"
                                    allowfullscreen
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
                                </iframe>
                            `;
                            
                            // Set up message listener for this iframe to detect when it starts playing
                            setupVideoEventListener(thumbnail.querySelector('iframe'), videoId);
                        });
                    } else {
                        // Regular thumbnail behavior - open in new tab
                        thumbnail.addEventListener('click', () => {
                            window.open(video.embedUrl, '_blank');
                        });
                    }
                }
            } else {
                // Generic video thumbnail for non-YouTube videos
                thumbnail.innerHTML = `
                    <div class="w-full h-full bg-gray-200 flex items-center justify-center cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                `;
                
                // Add click event to open the video in a new tab
                thumbnail.addEventListener('click', () => {
                    window.open(video.embedUrl, '_blank');
                });
            }
        }
        
        thumbnailWrapper.appendChild(thumbnail);
        card.appendChild(thumbnailWrapper);
        
        // Create video info section
        const infoSection = document.createElement('div');
        infoSection.className = 'p-4';
        
        // Video title
        const title = document.createElement('h3');
        title.className = 'font-bold text-lg mb-2 line-clamp-2';
        title.textContent = video.title;
        infoSection.appendChild(title);
        
        // Video description (if available)
        if (video.description) {
            const description = document.createElement('p');
            description.className = 'text-gray-600 text-sm mb-3 line-clamp-2';
            description.textContent = video.description;
            infoSection.appendChild(description);
        }
        
        // Video categories
        if (video.categories && video.categories.length > 0) {
            const categoriesContainer = document.createElement('div');
            categoriesContainer.className = 'flex flex-wrap mt-2';
            
            video.categories.forEach(category => {
                const badge = document.createElement('span');
                badge.className = 'category-badge bg-blue-100 text-blue-800';
                badge.textContent = category;
                categoriesContainer.appendChild(badge);
            });
            
            infoSection.appendChild(categoriesContainer);
        }
        
        card.appendChild(infoSection);
        return card;
    }
    
    // Helper function to extract YouTube video ID
    function getYoutubeVideoId(url) {
        const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }
    
    // Helper function to pause all currently playing videos
    function pauseAllVideos() {
        const embeddedVideos = document.querySelectorAll('.youtube-embed');
        embeddedVideos.forEach(iframe => {
            // Send postMessage to pause the video
            iframe.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: 'pauseVideo',
                args: ''
            }), '*');
        });
    }
    
    // Function to set up event listener for YouTube iframe API
    function setupVideoEventListener(iframe, videoId) {
        // Add a unique ID to identify this video
        iframe.id = `youtube-${videoId}`;
        
        // Listen for messages from YouTube
        window.addEventListener('message', function(event) {
            // Only process messages from YouTube
            if (event.origin !== 'https://www.youtube.com') return;
            
            try {
                const data = JSON.parse(event.data);
                
                // When this video starts playing, pause all others
                if (data.event === 'onStateChange' && data.info === 1) { // 1 = playing
                    const currentVideoId = iframe.id;
                    
                    // Pause all other videos
                    document.querySelectorAll('.youtube-embed').forEach(otherIframe => {
                        if (otherIframe.id !== currentVideoId) {
                            otherIframe.contentWindow.postMessage(JSON.stringify({
                                event: 'command',
                                func: 'pauseVideo',
                                args: ''
                            }), '*');
                        }
                    });
                }
            } catch (e) {
                // Not a JSON message we can process
            }
        });
    }
    
    // Event listeners
    searchInput.addEventListener('input', handleSearch);
    searchButton.addEventListener('click', handleSearch);
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', fetchVideos);
})();