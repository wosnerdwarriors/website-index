/**
 * Helper for applying the template to subfolder pages
 * 
 * Usage:
 * 1. Include this script in your page
 * 2. Call applyTemplate() with the page title and optional callbacks
 * 
 * Example:
 * <script src="/js/template-helper.js"></script>
 * <script>
 *   applyTemplate('Research Calculator', {
 *     beforeContent: function() {
 *       // Add additional CSS links or meta tags to head
 *       addStylesheet('/researchtree/css/researchtree.css');
 *     },
 *     afterContent: function() {
 *       // Add additional scripts at the end of body
 *       addScript('/researchtree/js/researchtree.js');
 *     }
 *   });
 * </script>
 */

// Function to load the template and apply it to the current page
function applyTemplate(pageTitle, options = {}) {
  // Default options
  const defaultOptions = {
    beforeContent: function() {},
    afterContent: function() {}
  };
  
  // Merge options
  options = { ...defaultOptions, ...options };
  
  // Save the current body content
  const currentContent = document.body.innerHTML;
  
  // Get template URL from config
  async function getTemplateUrl() {
    const configResponse = await fetch('/config.json');
    const config = await configResponse.json();
    return config.dataSources.template.url;
  }

  // Fetch the template
  getTemplateUrl()
    .then(templateUrl => fetch(templateUrl))
    .then(response => response.text())
    .then(templateHtml => {
      // Replace placeholders
      templateHtml = templateHtml
        .replace('PAGE_TITLE - WOS Nerds', pageTitle + ' - WOS Nerds')
        .replace('PAGE_TITLE', pageTitle)
        .replace('<!-- MAIN_CONTENT -->', '<div id="template-content-placeholder"></div>')
        .replace('<!-- ADDITIONAL_CSS -->', '<div id="template-head-placeholder"></div>')
        .replace('<!-- ADDITIONAL_SCRIPTS -->', '<div id="template-scripts-placeholder"></div>');
      
      // Apply the template to the document
      document.documentElement.innerHTML = templateHtml;
      
      // Execute beforeContent callback (for adding items to head)
      options.beforeContent();
      
      // Insert the original content
      document.getElementById('template-content-placeholder').outerHTML = currentContent;
      
      // Execute afterContent callback (for adding scripts)
      options.afterContent();
    })
    .catch(error => {
      console.error('Error loading template:', error);
    });
}

// Helper function to add stylesheets
function addStylesheet(href) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.getElementById('template-head-placeholder').appendChild(link);
}

// Helper function to add scripts
function addScript(src) {
  const script = document.createElement('script');
  script.src = src;
  document.getElementById('template-scripts-placeholder').appendChild(script);
}