# PersonaLife
This is an app for tracking daily activities and personal growth using AI-powered persona stats. Users log activities and feelings, AI calculates boosts to 5 stats, displayed with RPG-style leveling.

**Tech Stack**: React + Vite + Tailwind CSS + Capacitor (mobile)

## Architecture
- **Screens**: Home (overview), AddActivity (form), Calendar (entries), Stats (progress bars), Settings (export/import)
- **Data Flow**: User input → Gemini AI → localStorage persistence + stat aggregation
- **Mobile/Desktop**: Capacitor syncs web build to native, Electron packages web app
- **Key Files**: 
  - `src/App.jsx`: Main component with screens and state management


## Critical Workflows
- **Development**: `npm run dev` (Vite dev server)
- **Web Build**: `npm run build` (outputs to `dist/`)
- **Mobile**: `npx cap sync android` then `npx cap run android` (after build)
- **Desktop**: `npm run electron:build` (electron-builder to `release/`)

