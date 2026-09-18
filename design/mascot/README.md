# Professor Ponku

The Data Detective mascot: a magnifying glass in a deerstalker and a teal cape. These files are the
source art for the app, social banners and anything else that should feel like the same brand.

## Palette

The official brand colours, sampled from the swatches on the character sheet. In the app they are
the `ponku-*` tokens in `src/index.css`, and the app's scales are built from them.

| Colour   | Hex       | Used for in the app                                   |
| -------- | --------- | ----------------------------------------------------- |
| Teal     | `#18acac` | Actions, links, focus, the current lesson (`current`) |
| Coral    | `#f97d65` | Streaks and the daily goal (`streak`)                 |
| Brown    | `#ae734e` | XP (`xp`)                                             |
| Espresso | `#40291e` | Text (`slate-900`), dark mode backgrounds             |
| Sky      | `#bdd7e5` | Soft highlights; Ponku's lens                         |
| Cream    | `#feecdc` | Page background (`slate-50`)                          |

Buttons use a darker teal (`#0e7d7e`) than the swatch, because white text on `#18acac` is only
about 3:1. Right and wrong answers stay green and amber: their meaning matters more than the brand.

## Files

- `professor-ponku-sheet.webp`: the original character sheet.
- One transparent PNG per pose, full size: `waving`, `celebrating`, `thinking`, `thumbs-up`,
  `notes`, `report`, `sleeping`, plus the `side` and `back` reference views.
- `face.png`: the head, used for the favicon and the app's logo.
- `icon-report.png`, `icon-clipboard.png`, `icon-sparkles.png`: the small props from the sheet.
- `cut-poses.py`: how the poses were cut out (see below).

The app uses smaller WebP copies in `src/assets/mascot/`, through the `Mascot` component.

## Where each pose appears

| Pose        | Moment                                                           |
| ----------- | ---------------------------------------------------------------- |
| Waving      | Welcome screen, and the unit header on the path                  |
| Thinking    | Lesson intros, hints, a wrong answer, empty states, the 404 page |
| Thumbs up   | A right answer; the checkpoint when it is already passed         |
| Celebrating | Lesson complete, checkpoint passed, mission complete             |
| Notes       | The case brief in the mission                                    |
| Report      | The portfolio summary after the mission                          |
| Sleeping    | Streak reminders, and the wait before a checkpoint retake        |

## How the poses were cut

`cut-poses.py` flood-fills the white paper and the soft grey drop shadows from the edges of each
pose, so white inside the character (the lens, the eyes) stays. Edge pixels get partial
transparency with the white taken out, so the outlines have no halo on dark backgrounds. It needs
Python 3 with Pillow and numpy:

```bash
python design/mascot/cut-poses.py path/to/new-sheet.webp
```

The pose boxes in the script match this sheet's layout; a new sheet with a different layout needs
new boxes. The art is raster. For large prints or hero banners, trace the poses you use most into
SVG first (for example with a vectorizing tool) so they stay sharp.
