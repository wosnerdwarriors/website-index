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
4. **Start the local server**: `npm start` (Access at `http://localhost:3000`)
5. For development with live CSS updates: `npm run dev`

## Design & Aesthetics (Premium Suggestions)

To elevate the project's visual appeal from a basic utility to a premium gaming tool, consider the following styling updates:

### 1. Modern Sidebar (Glassmorphism)

Instead of solid `bg-gray-100`, use a dark-themed glassmorphism effect:

- **Background**: `bg-slate-950/80` with `backdrop-blur-md`.
- **Border**: A thin `border-r border-white/10`.
- **Text**: Use `text-slate-300` as default and `text-white` for active states.

### 2. Button Refinement (Gradients & Glows)

Modify `js/navbar.js` to use sophisticated gradients instead of flat colors:

- Instead of `bg-blue-500`, use `bg-gradient-to-br from-blue-500 to-blue-700`.
- Add a subtle `shadow-[0_0_15px_rgba(59,130,246,0.3)]` on hover to create a "glow" effect.

### 3. Typography

- Import **Inter** or **Outfit** from Google Fonts.
- Set headings to `font-bold tracking-tight` for a modern gaming look.

### 4. Micro-interactions

- Add `transition-all duration-300` to all buttons.
- Use `hover:scale-[1.02] hover:-translate-y-0.5` on the tool cards in `index.html`.

### 5. Layout Improvements

- Increase whitespace (padding) between sections.
- Use rounded-xl or rounded-2xl (`rounded-2xl`) for all cards to soften the UI.

The site uses a template system for consistent layout across all tools:

1. Each tool folder can use the template by including the template helper:

```html
<script src="/js/template-helper.js"></script>
<script>
  applyTemplate("Tool Name", {
    beforeContent: function () {
      // Add custom CSS
      addStylesheet("/toolname/css/style.css");
    },
    afterContent: function () {
      // Add custom JS
      addScript("/toolname/js/script.js");
    },
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
