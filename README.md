# The Paper Island — A Pop-up Story

A single-source interactive paper storybook for the browser, with a shared web runtime prepared for iOS and Android through Capacitor.

## What is implemented

- A perspective 3D book on a dark green table, with a red-brown cover, page stack, spine and red ribbon.
- Five procedural low-poly paper dioramas: The Bell Gate, The Rope Bridge, The Book House, The Windmill and The Lighthouse.
- Pip the fox appears on every spread with an owl, frog, mouse, hedgehog or sailor penguin companion.
- A local transparent puppet texture atlas (`assets/puppet-atlas.svg`), rectangle/pivot manifest (`assets/puppet-atlas.json`) and white-background parts reference sheet (`assets/puppet-parts-sheet.svg`). Each puppet is assembled from separate head, eyes, body, arms, feet, tail/wing and prop cards.
- A subdivided page mesh that curls around a moving fold, changes to the next print on its back, and folds the pop-up pieces down as the page rises.
- Interactive chapter props: ring the bell/open the gate; slide bridge planks into place; flutter the Book House roof pages; drag the windmill sails with inertia; pull the lighthouse lever for two lamp flashes and two boat answers.
- Page drag, arrow keys, continuous chapter scrubber, chapter dots, URL hashes and browser Back/Forward navigation.
- Story card, Pip's notebook note, five-pin island map, optional WebAudio sounds (off by default), responsive layout, PWA manifest and offline service-worker cache.

## Rendering approach

The first runtime is self-contained. It uses a lightweight Canvas 2D software 3D renderer with world-space XYZ geometry, perspective projection, depth sorting, polygon shading, card textures and a subdivided animated page mesh. It does not load remote fonts, image URLs, model downloads or CDN scripts. Scenery is generated from code; the puppet atlas is stored locally so the page can run offline after its first visit.

## Run locally

Requires Node.js 22 or newer.

```bash
npm run dev
```

Open `http://localhost:4173`.

```bash
npm run check
npm run build
npm run preview
```

The production site is written to `dist/`.

## Controls

- Drag the right page left to turn forward; drag the left page right to go back.
- Release after halfway to complete the turn; release before halfway to return the page.
- Use the bottom slider, chapter dots, arrow buttons or keyboard arrow keys.
- Drag a table margin to tilt the book; release to let it settle back.
- Drag the Windmill sails to spin them. Click each chapter landmark or use the mustard action in the reading card to operate the chapter prop.
- Use Map to jump between chapters. Hashes: `#gate`, `#bridge`, `#library`, `#mill`, `#lighthouse`.
- Sound is off by default. Effects are generated with WebAudio; no audio files are downloaded.

## iOS and Android

The web app is the single source of truth. Capacitor 8 is the native wrapper layer, with app id `com.yjwzb.paperisland` and `webDir: dist`.

```bash
npm install
npm run build
npm run cap:add:android
npm run cap:add:ios
npm run cap:sync
npm run cap:open:android
npm run cap:open:ios
```

Android builds require Android Studio and the Android SDK. iOS builds require macOS and Xcode. Native platform folders are generated locally by Capacitor and are not committed in this web-first foundation.

## Project layout

```text
index.html
styles.css
src/main.js                 # 3D paper renderer, scene geometry, animation and interactions
assets/puppet-atlas.svg     # local cut-card texture atlas
assets/puppet-atlas.json    # atlas rectangles and pivots
assets/puppet-parts-sheet.svg # white-background separated puppet parts sheet
public/icon.svg
manifest.webmanifest
sw.js
capacitor.config.json
server.mjs
build.mjs
```
