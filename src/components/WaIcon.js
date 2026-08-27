// components/WaIcon.js
//
// The icon set for the WhatsApp screens, drawn as SVG paths.
//
// Not react-native-vector-icons: that package is in package.json but was never
// wired up — no fonts.gradle in the Android build, no font files in assets — so
// every glyph would render as a tofu box until someone rebuilds. react-native-svg
// is already installed and proven (Barcode128 uses it), so these need no native
// change at all.
//
// Paths are Material-style 24x24, which is what WhatsApp itself draws from.

import React from 'react';
import Svg, {Path, Circle, Rect} from 'react-native-svg';

const PATHS = {
  plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z',
  contact:
    'M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-3.34 0-10 1.67-10 5v3h20v-3c0-3.33-6.66-5-10-5z',
  // Dark-mode switch: a moon when it is on, a sun when it is off.
  moon: 'M9 2c-1.05 0-2.05.16-3 .46 4.06 1.27 7 5.06 7 9.54s-2.94 8.27-7 9.54c.95.3 1.95.46 3 .46 5.52 0 10-4.48 10-10S14.52 2 9 2z',
  sun:
    'M6.76 4.84 4.96 3.05 3.55 4.46l1.79 1.79zM4 10.5H1v2h3zm9-9.95h-2V3.5h2zm7.45 3.91-1.41-1.41-1.79 1.79 1.41 1.41zm-3.21 13.7 1.79 1.8 1.41-1.41-1.8-1.79zM20 10.5v2h3v-2zm-8-5a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm-1 16.95h2V19.5h-2zm-7.45-3.91 1.41 1.41 1.79-1.8-1.41-1.41z',
  // Follows the phone's own setting.
  auto: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18V4a8 8 0 0 1 0 16z',
  search:
    'M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z',
  send: 'M2.01 21 23 12 2.01 3 2 10l15 2-15 2z',
  mic: 'M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72z',
  attach:
    'M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v10.5a1 1 0 0 1-2 0V6H10v9.5a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v12.5a5.5 5.5 0 0 0 11 0V6z',
  camera:
    'M9 2 7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3.17L15 2zm3 15a5 5 0 1 1 5-5 5 5 0 0 1-5 5zm0-8a3 3 0 1 0 3 3 3 3 0 0 0-3-3z',
  clock:
    'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7z',
  alert:
    'M12 2 1 21h22zm1 14h-2v2h2zm0-6h-2v4h2z',
  reply: 'M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z',
  forward: 'M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z',
  star: 'm12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  pin: 'M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2z',
  phone:
    'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.25 1z',
  more: 'M12 8a2 2 0 1 0-2-2 2 2 0 0 0 2 2zm0 2a2 2 0 1 0 2 2 2 2 0 0 0-2-2zm0 6a2 2 0 1 0 2 2 2 2 0 0 0-2-2z',
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z',
  newChat:
    'M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-7 9h-2v2H9v-2H7V9h2V7h2v2h2z',
  mute: 'M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45A4.9 4.9 0 0 0 16.5 12zM19 12a7 7 0 0 1-1 3.55l1.23 1.23A8.9 8.9 0 0 0 21 12a9 9 0 0 0-7-8.77v2.06A7 7 0 0 1 19 12zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25A6.9 6.9 0 0 1 14 18.7v2.06a9 9 0 0 0 4.73-2.06L20.73 21 22 19.73l-9-9zM12 4 9.91 6.09 12 8.18z',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm2 16H8v-2h8zm0-4H8v-2h8zm-3-5V3.5L18.5 9z',
  image:
    'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5z',
  play: 'M8 5v14l11-7z',
  pause: 'M6 19h4V5H6zm8-14v14h4V5z',
  download: 'M19 9h-4V3H9v6H5l7 7zM5 18v2h14v-2z',
  location:
    'M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5z',
  catalog:
    'M19 6h-2a5 5 0 0 0-10 0H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm-7-3a3 3 0 0 1 3 3H9a3 3 0 0 1 3-3z',
  template:
    'M19 3h-4.18A3 3 0 0 0 9.18 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 0a1 1 0 1 1-1 1 1 1 0 0 1 1-1zM7 17v-2h7v2zm0-4v-2h10v2zm0-4V7h10v2z',
  savedReply:
    'M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM7 9h10v2H7zm0 4h7v2H7z',
  emoji:
    'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zM8.5 11A1.5 1.5 0 1 0 7 9.5 1.5 1.5 0 0 0 8.5 11zm7 0A1.5 1.5 0 1 0 14 9.5a1.5 1.5 0 0 0 1.5 1.5zM12 17.5a5.5 5.5 0 0 0 4.9-3H7.1a5.5 5.5 0 0 0 4.9 3z',
  archive:
    'M20.5 4.2 19.1 2.5A1.4 1.4 0 0 0 18 2H6a1.4 1.4 0 0 0-1.1.5L3.5 4.2A2 2 0 0 0 3 5.5V19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5.5a2 2 0 0 0-.5-1.3zM12 17.5 6.5 12H10v-2h4v2h3.5zM5.1 4l.8-1h12.1l.9 1z',
  trash: 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z',
  backspace:
    'M22 3H7a2 2 0 0 0-1.6.8L0 12l5.4 8.2A2 2 0 0 0 7 21h15a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-3.3 12.3-1.4 1.4L14 13.4l-3.3 3.3-1.4-1.4L12.6 12 9.3 8.7l1.4-1.4L14 10.6l3.3-3.3 1.4 1.4L15.4 12z',
  keyboard:
    'M20 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zM11 8h2v2h-2zm0 3h2v2h-2zM8 8h2v2H8zm0 3h2v2H8zM7 15h10v2H7zM5 8h2v2H5zm0 3h2v2H5zm9-3h2v2h-2zm0 3h2v2h-2zm3-3h2v2h-2zm0 3h2v2h-2z',
};

/**
 * @param name  key from PATHS
 * @param size  square size in dp (default 24)
 * @param color fill colour
 */
const WaIcon = ({name, size = 24, color = '#54656F', style}) => {
  const d = PATHS[name];

  // An unknown name draws nothing rather than throwing — a missing icon should
  // never take a chat screen down with it.
  if (!d) return null;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <Path d={d} fill={color} />
    </Svg>
  );
};

/**
 * Delivery ticks, WhatsApp-style.
 *
 * Stroked rather than filled: the Material done_all glyph is a solid shape and
 * renders as two heavy wedges at bubble size, where WhatsApp's are thin lines
 * with a wide gap. Drawn in a 18x12 box so they sit on the timestamp's baseline
 * instead of the taller 24x24 grid the other icons use.
 */
export const WaTicks = ({ double = true, size = 16, color = '#8696A0' }) => (
  <Svg width={size} height={(size * 12) / 18} viewBox="0 0 18 12">
    {double && (
      <Path
        d="M1 6.6 4.4 10 10.6 2.2"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    )}
    <Path
      d={double ? 'M6.6 6.6 10 10 17 2.2' : 'M3.5 6.6 6.9 10 13.9 2.2'}
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

/** The unread-count pill and other filled circles reuse this. */
export const WaDot = ({size = 8, color = '#25D366', style}) => (
  <Svg width={size} height={size} viewBox="0 0 8 8" style={style}>
    <Circle cx="4" cy="4" r="4" fill={color} />
  </Svg>
);

/** A rounded square placeholder, used where a thumbnail is missing. */
export const WaPlaceholder = ({size = 24, color = '#8696A0'}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="3" y="3" width="18" height="18" rx="3" fill={color} opacity={0.25} />
  </Svg>
);

export default WaIcon;
