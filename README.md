# apple-motion-design
Animation motion design style Apple avec React, HTML et CSS

## moving: a kinetic typography study

`index.html` plays a looping 13-scene kinetic-type sequence that borrows the visual language of Apple-style fan edits: a soft grey canvas, heavy black type, macOS folders, text-selection handles, keycaps, and spring easing. All the shapes are drawn in CSS or SVG. There are no image assets.

| # | Scene | Technique |
|---|-------|-----------|
| 1 | i [can]'t | A word swapped for an object: a CSS-drawn tin rolls into the gap |
| 2 | selection | Folders scatter in on a spring; a blue text selection grows with its handles |
| 3 | typing | Typewriter text with a blinking caret |
| 4 | falling | Letters drop with staggered rotation; serif and sans are mixed |
| 5 | orbit | Letter tokens orbit while counter-rotating so they stay upright |
| 6 | rings | SVG `textPath` rings spin in opposite directions around a keycap |
| 7 | focus pull | A glyph drawn on a canvas sharpens from pixels as a lens sweeps in |
| 8 | Any{ } | Objects pop in and out between braces |
| 9 | collage | Cropped black and white blocks jump around with `steps()` |
| 10 | fly-through | Folders fly past the camera in 3D perspective |
| 11 | slam | Giant letters slam onto an arc |
| 12 | tags | Name tags drop into a pile over the words |
| 13 | outro | Title card |

Run a local server and open the page:

```sh
python3 -m http.server 8000
# → http://localhost:8000
```

Controls: click the stage or press <kbd>Space</kbd> to play or pause, <kbd>←</kbd> / <kbd>→</kbd> to move between scenes, and click the progress track to jump to a scene. The stage scales with its container through container-query units (`cqw`).

The timings and easing curves are variables in `:root` and in the `SCENES` array in `app.jsx`.
