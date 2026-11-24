# The Folded Atlas — A Pop-up Story

A high-fidelity, tactile 3D storybook. The first rebuilt chapter is **The Lantern Gate**, a paper-crafted diorama with Pip the fox, the owl keeper, a bell tower, layered pine trees, paper mountains, a cottage, a winding path and a brass bell interaction.

## Current chapter

- Three.js / WebGL 3D renderer with soft directional lighting, contact shadows, paper roughness and a subtle fiber bump texture.
- A real open-book model with a red-brown cover, layered page block, center spine, ribbon and textured illustrated map pages.
- A segmented page mesh that bends around a moving fold, shows its reverse print and settles with an eased turn. Chapter 02 is currently a teaser while the first chapter is being polished.
- Procedural paper diorama geometry: gabled gatehouse, arched stone opening, hinged wooden doors, brass bell, hanging lanterns, roof flag, pine trees, layered mountains, paper clouds, sun, cottage, flowers, grass, signpost and a winding path.
- Separate cut-card puppet atlas parts for Pip and the owl. Head, eyes, body, arms, feet, tail and props animate independently.
- Bell interaction opens the gate and swings the bell; table drag tilts the book and eases back; keyboard arrows and the page controls turn the page.
- Story card with browser speech synthesis narration, optional WebAudio paper/bell ambience (off by default), map overlay, responsive UI and PWA offline caching.

## Run locally

Use Node.js 20.19.5 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

```bash
npm run check
npm run build
npm run preview
```

The production site is written to `dist/`.

## Controls

- Click the brass bell in the gatehouse to ring it and open the doors.
- Drag the right-hand page left to turn forward. Release after halfway to finish; otherwise the page settles back.
- On the chapter teaser, drag the left-hand page right or use the previous arrow to return.
- Drag an open area of the book/table to rotate the book; release to ease back to the reader's seat.
- Use **Read this page** for the story card. Browser speech synthesis reads the narration; recorded voice files can later replace the narration URL without changing the story data structure.
- Sound is off by default. Enabling it adds soft generated paper and meadow ambience plus bell/page effects.
- Press `B` to ring the bell, arrow keys to turn pages, and `Escape` to close overlays.

## Story and audio structure

The first chapter is defined in `src/data/story.js`. Story text, notebook notes, narration language and optional `audioUrl` are data fields, separate from the renderer. `src/engine/AudioEngine.js` currently supports WebAudio effects and browser speech synthesis. Later chapters can provide recorded narration and character voice lines through the same data-driven structure.

## iOS and Android

The web app remains the single source of truth. Capacitor wraps the built Vite app, with app id `com.yjwzb.paperisland` and `webDir: dist`.

```bash
npm run build
npm run cap:add:android
npm run cap:add:ios
npm run cap:sync
npm run cap:open:android
npm run cap:open:ios
```

Android builds require Android Studio and the Android SDK. iOS builds require macOS and Xcode.
