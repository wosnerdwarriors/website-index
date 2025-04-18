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
    
    // Fetch videos data
    async function fetchVideos() {
        try {
            const response = await fetch('/videos/videos-data.json');
            if (!response.ok) {
                throw new Error('Failed to fetch videos data');
            }
            videoData = await response.json();
            
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
            
            videos.forEach(video => {
                const videoCard = createVideoCard(video);
                videosContainer.appendChild(videoCard);
            });
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
                    
                    // Add click event to open YouTube in a new tab
                    thumbnail.addEventListener('click', () => {
                        window.open(video.embedUrl, '_blank');
                    });
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
    
    // Event listeners
    searchInput.addEventListener('input', handleSearch);
    searchButton.addEventListener('click', handleSearch);
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', fetchVideos);
})();