# Past Memory Log

- **2026-04-23**:
  - Initialized project AI documentation.
  - Analyzed `KeyVisualizer_v2.html`. App is a single-page HTML/JS/CSS tool for parsing QMK JSON layouts and visualizing wiring paths.
  - Defined standard MCU profiles (RP2040, Pro Micro, nice!nano) internally in JS.
  - Key functionality includes a "mirror" mode for bottom view (soldering).
  - Implemented documentation scaffold: `README.md`, `scaffold.md`, `GEMINI.md`, and this file (`past_memory.md`) to comply with user global rules.
  - Fixed `keyboard.json` right-half matrix indices to be properly mirrored for a symmetric handwired layout.
  - Corrected `pid` to non-zero `0x6060` in `keyboard.json`.
  - Replaced invalid `RM_` prefixed RGB keycodes with standard `RGB_` QMK keycodes in `keymap.c` Layer 3.
  - Reverted `keyboard.json` matrix and PID changes as requested because physical wiring was already locked in.
  - Added SVG wiring diagram feature to `KeyVisualizer_v2.html` to visually connect matrix rows and columns.
  - Corrected previous AI's mistake: Reverted Right-Half inner thumb key from `[9,0]` back to `[9,5]` in `keyboard.json`. Symmetric left-to-right wiring means the inner thumb is connected to GP5 (Col 5) on both halves.
  - Added missing Layer 3 (Adjust) back to `keymap.c` to prevent firmware crashes when `MO(3)` is pressed.
  - Upgraded `KeyVisualizer_v2.html` "Show Wiring" SVG logic to use standard colored ribbon cable colors instead of static red/blue lines.
  - Implemented client-side `keymap.c` parsing in `KeyVisualizer_v2.html` using a parenthesis-tracking algorithm to handle nested QMK macros correctly.
  - Added a keycode translation dictionary to the visualizer to render raw `KC_` codes as human-friendly keycap legends in Top View.

- **2026-04-28**:
  - Added explicit MCU profile support for the "NRF52840 Dev Board (nice!nano V2.0 Compatible)" to `KeyVisualizer_v2.html` mirroring `nice_nano` pins, resolving a feature request.
  - Implemented a dynamic "Hardware Peripherals" panel in `KeyVisualizer_v2.html` to support OLED screens (I2C) and Rotary Encoders. The panel gracefully falls back to recommended MCU-specific pins if explicit properties (`currentJSON.i2c` / `currentJSON.encoder`) are missing from the configuration JSON.
  - Added an interactive "Assign Encoders" feature allowing users to visually click on matrix keys to convert them into Rotary Encoders. The tool automatically updates tooltips to reflect both the matrix click wiring and the rotary MCU wiring, significantly improving UX over static dropdowns.
  - Excluded encoder positions from the SVG Matrix wiring loop so that matrix wires correctly bypass the physical encoder locations. Corrected default `boardProfiles` to use strictly free MCU pins to prevent tooltip overlaps with default matrix pins.
  - Implemented Export features: `💾 Save JSON` dynamically injects the user's interactive encoder and I2C pin assignments into their configuration and downloads it. `📄 Copy C Code` generates the standard QMK `encoder_update_user` boilerplate for the `keymap.c` file based on the number of assigned encoders.
