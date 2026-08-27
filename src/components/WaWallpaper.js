// components/WaWallpaper.js
//
// The doodle wallpaper behind a conversation.
//
// Drawn as one tiled SVG pattern rather than a bitmap: an image asset would add
// two files (light + dark) at several hundred KB each, would need a rebuild to
// land, and would either blur or band on a tall screen. A pattern is a couple of
// KB, stays crisp at any density, and re-tints for dark mode by changing one
// colour.
//
// This is an approximation of WhatsApp's look — a dense, evenly-scattered field
// of small line doodles at low contrast — not their artwork, which is Meta's.
// What makes it read the same is density and scale: roughly one glyph every
// 45px, each about 20px across, at a stroke barely darker than the paper.

import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Rect, G, Path } from 'react-native-svg';

// Each glyph is drawn inside a 24x24 box so placements can share one transform.
const GLYPHS = {
  heart: 'M12 20c-4.6-3.6-8-6-8-9.8A4 4 0 0 1 12 8a4 4 0 0 1 8 2.2c0 3.8-3.4 6.2-8 9.8z',
  bubble: 'M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-9l-5 4v-4H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  camera: 'M3 7h3l1.6-2.4h8.8L18 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z',
  cameraLens: 'M12 9.5a3.8 3.8 0 1 0 3.8 3.8A3.8 3.8 0 0 0 12 9.5z',
  cup: 'M4 6h13v9a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z',
  cupHandle: 'M17 9h2.5a3 3 0 0 1 0 6H17',
  plane: 'M2 13l19-9-6.5 18-4-7z',
  planeFold: 'M10.5 15l10.5-11',
  smiley: 'M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z',
  smileyFace: 'M8.5 10v.6M15.5 10v.6M7.8 14.4a6 6 0 0 0 8.4 0',
  music: 'M9 18V6l10-2v12',
  musicHeads: 'M6 21a3 3 0 1 0 3-3 3 3 0 0 0-3 3zm10-2a3 3 0 1 0 3-3 3 3 0 0 0-3 3z',
  star: 'M12 3l2.8 5.9 6.2.8-4.5 4.5 1.1 6.3L12 17.6 6.4 20.5l1.1-6.3L3 9.7l6.2-.8z',
  gift: 'M4 9h16v11H4zM4 13h16M12 9v11',
  giftBow: 'M12 9c-3-4-8-3-8 0h8zm0 0c3-4 8-3 8 0h-8z',
  clock: 'M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 4v5.4l3.6 2.4',
  bulb: 'M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3zM9.5 20h5',
  key: 'M14 3a6 6 0 1 1-5.7 7.9L3 16.2V21h4.8l1.4-1.4v-2h2v-2h2l1.1-1.1A6 6 0 0 1 14 3z',
  umbrella: 'M12 3v17a2.5 2.5 0 0 0 5 0M2.5 12a9.5 9.5 0 0 1 19 0z',
  cloud: 'M6.5 19A4.5 4.5 0 0 1 6 10a6 6 0 0 1 11.4 1.6A3.9 3.9 0 0 1 17.5 19z',
  sun: 'M12 7.5A4.5 4.5 0 1 0 16.5 12 4.5 4.5 0 0 0 12 7.5z',
  sunRays: 'M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7',
  book: 'M3 5c3.5-1.6 6.5-1.6 9 0 2.5-1.6 5.5-1.6 9 0v14c-3.5-1.6-6.5-1.6-9 0-2.5-1.6-5.5-1.6-9 0zM12 5v14',
  ball: 'M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 4.5 4.3 3.1-1.6 5H9.3l-1.6-5z',
  leaf: 'M20 4C10 4 5 9 5 19c10 0 15-5 15-15zM5 19 20 4',
  pencil: 'M4 20l1-4L16 5l3 3L8 19zM14.5 6.5l3 3',
  envelope: 'M3 6h18v12H3zM3 6l9 7 9-7',
  bike: 'M6.5 12a4.5 4.5 0 1 0 4.5 4.5A4.5 4.5 0 0 0 6.5 12zm11 0a4.5 4.5 0 1 0 4.5 4.5A4.5 4.5 0 0 0 17.5 12zM6.5 16.5 11 7h5l1.5 9.5M9 7h4',
  flower: 'M12 10.5a2 2 0 1 0 2 2 2 2 0 0 0-2-2zm0-6.5a3 3 0 0 1 0 6 3 3 0 0 1 0-6zm0 9a3 3 0 0 1 0 6 3 3 0 0 1 0-6zm-4.5-4.5a3 3 0 0 1 0 6 3 3 0 0 1 0-6zm9 0a3 3 0 0 1 0 6 3 3 0 0 1 0-6z',
};

// x, y, rotation, scale, and which glyphs make up each doodle. Positions are
// deliberately uneven — a regular grid is what makes a tiled background read as
// wallpaper-that-repeats instead of as texture.
const PLACEMENTS = [
  [10, 8, -12, 0.8, ['heart']],
  [70, 4, 8, 0.75, ['bubble']],
  [131, 12, -6, 0.8, ['camera', 'cameraLens']],
  [192, 6, 14, 0.72, ['music', 'musicHeads']],
  [245, 16, -10, 0.78, ['cup', 'cupHandle']],
  [36, 52, 18, 0.76, ['plane', 'planeFold']],
  [98, 46, -8, 0.8, ['smiley', 'smileyFace']],
  [158, 56, 10, 0.74, ['star']],
  [215, 50, -14, 0.8, ['gift', 'giftBow']],
  [268, 58, 6, 0.72, ['clock']],
  [6, 96, 10, 0.74, ['bulb']],
  [62, 104, -16, 0.78, ['umbrella']],
  [124, 94, 6, 0.8, ['cloud']],
  [180, 102, -8, 0.7, ['sun', 'sunRays']],
  [238, 98, 12, 0.76, ['book']],
  [286, 108, -6, 0.72, ['leaf']],
  [28, 146, -10, 0.78, ['ball']],
  [86, 152, 14, 0.74, ['pencil']],
  [146, 142, -6, 0.76, ['envelope']],
  [204, 150, 8, 0.7, ['bike']],
  [258, 144, -12, 0.76, ['flower']],
  [12, 196, 8, 0.72, ['bubble']],
  [66, 190, -14, 0.78, ['key']],
  [122, 200, 10, 0.74, ['heart']],
  [176, 192, -8, 0.8, ['cup', 'cupHandle']],
  [232, 202, 12, 0.72, ['star']],
  [284, 194, -10, 0.76, ['smiley', 'smileyFace']],
  [40, 240, 12, 0.76, ['clock']],
  [96, 248, -8, 0.72, ['leaf']],
  [152, 238, 6, 0.78, ['music', 'musicHeads']],
  [208, 246, -14, 0.74, ['cloud']],
  [262, 240, 10, 0.7, ['camera', 'cameraLens']],
  [4, 286, -6, 0.74, ['gift', 'giftBow']],
  [110, 292, 10, 0.72, ['plane', 'planeFold']],
  [222, 288, -12, 0.76, ['flower']],
];

// Big enough that the eye does not catch the repeat on a tall screen.
const TILE = 330;

const WaWallpaper = ({ dark = false, background, style }) => {
  // Barely off the paper. Anything stronger competes with the bubbles, which is
  // the thing WhatsApp's wallpaper is careful never to do.
  const ink = dark ? '#1F2C33' : '#DCD1C4';
  const bg = background || (dark ? '#0B141A' : '#EFE7DE');

  return (
    <Svg
      style={[StyleSheet.absoluteFill, style]}
      pointerEvents="none"
      accessible={false}
    >
      <Defs>
        <Pattern
          id="waDoodles"
          x="0"
          y="0"
          width={TILE}
          height={TILE}
          patternUnits="userSpaceOnUse"
        >
          <G
            stroke={ink}
            strokeWidth={1.7}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {PLACEMENTS.map(([x, y, rotate, scale, names], i) => (
              <G
                key={i}
                transform={`translate(${x} ${y}) rotate(${rotate} 12 12) scale(${scale})`}
              >
                {names.map(name => (
                  <Path key={name} d={GLYPHS[name]} />
                ))}
              </G>
            ))}
          </G>
        </Pattern>
      </Defs>

      <Rect x="0" y="0" width="100%" height="100%" fill={bg} />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#waDoodles)" />
    </Svg>
  );
};

export default WaWallpaper;
