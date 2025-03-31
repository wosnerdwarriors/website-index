# WOS Nerds Website

This repository contains the WOS Nerds website - a collection of tools and calculators for Whiteout Survival.

## Website Structure

The website is organized into multiple standalone tools in subfolders:

- `/rallytracker` - Track rallies and coordination
- `/researchtree` - Research calculator and planner
- `/troop-stats` - Troop statistics viewer
- `/calendar` - Calendar of events
- `/svs-history` - SVS History viewer
- `/alliancerss` - Alliance RSS Calculator
- `/formationbuilder` - Formation building tool
- `/layout-planner` - Base layout planner

## Technology Stack

- **Tailwind CSS** - For responsive styling
- **Vanilla JavaScript** - For functionality
- **Static HTML** - No backend required

## Mobile Support

The website is designed to be fully responsive and mobile-friendly with:

- Mobile-first design approach
- Responsive sidebar navigation
- Optimized layouts for small screens
- Touch-friendly interface elements

## Development

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the CSS: `npm run build:css`
4. For development with live CSS updates: `npm run watch:css`

### Template System

The site uses a template system for consistent layout across all tools:

1. Each tool folder can use the template by including the template helper:
```html
<script src="/js/template-helper.js"></script>
<script>
  applyTemplate('Tool Name', {
    beforeContent: function() {
      // Add custom CSS
      addStylesheet('/toolname/css/style.css');
    },
    afterContent: function() {
      // Add custom JS
      addScript('/toolname/js/script.js');
    }
  });
</script>
```

2. Alternatively, copy `/template.html` and replace placeholders:
   - `PAGE_TITLE` - The page title
   - `MAIN_CONTENT` - Your tool's HTML content
   - `ADDITIONAL_CSS` - Your tool's CSS links
   - `ADDITIONAL_SCRIPTS` - Your tool's JavaScript files

## Contributing

Contributions are welcome! To add a new tool:

1. Create a new folder in the root directory
2. Use the template system to maintain consistent styling
3. Create your tool using HTML, CSS, and JavaScript
4. Add your tool to the navigation in `/navbar.html`