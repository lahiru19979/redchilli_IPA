// components/Barcode128.js
//
// A CODE128-B barcode drawn with react-native-svg — the same symbology and the
// same payload JsBarcode produces on the web, so a label scanned from a phone
// screen reads identically to one printed from the CRM.
//
// Written out rather than pulled from a package: the app has no barcode library,
// and adding one would mean another native rebuild for ~60 lines of encoding.

import React, {useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Svg, {Rect} from 'react-native-svg';

// The 107 CODE128 symbols. Each entry is six module widths: bar, space, bar,
// space, bar, space. The last is the stop pattern, which carries a seventh.
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312',
  '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
  '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131',
  '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
  '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
  '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321',
  '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
  '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114',
  '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112',
  '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
  '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412',
  '211214', '211232', '2331112',
];

const START_B = 104;
const STOP = 106;

/**
 * Turn a string into the run-length modules of a CODE128-B symbol.
 * Returns [{width, bar}] where width is in modules.
 */
const encode = value => {
  const chars = String(value || '');
  const codes = [START_B];
  let checksum = START_B;
  let position = 0;

  for (let i = 0; i < chars.length; i += 1) {
    // CODE128-B covers ASCII 32..127; anything else is skipped rather than
    // producing a symbol no scanner can read.
    const code = chars.charCodeAt(i) - 32;
    if (code < 0 || code > 95) continue;

    codes.push(code);
    position += 1;
    // Weighted sum: each value multiplied by its 1-indexed position.
    checksum += code * position;
  }

  codes.push(checksum % 103);
  codes.push(STOP);

  const runs = [];

  codes.forEach(code => {
    const pattern = PATTERNS[code] || PATTERNS[0];

    for (let i = 0; i < pattern.length; i += 1) {
      runs.push({width: parseInt(pattern[i], 10), bar: i % 2 === 0});
    }
  });

  return runs;
};

const Barcode128 = ({
  value,
  height = 70,
  moduleWidth = 2,
  // Hard ceiling on the drawn width. A CODE128 symbol is 11 modules per
  // character plus 24, so a 15-character payload at moduleWidth 2 is 400px —
  // wider than a phone. Without this the bars overflow whatever contains them.
  maxWidth,
  showValue = true,
  displayValue,
  color = '#000',
}) => {
  const runs = useMemo(() => encode(value), [value]);
  const modules = runs.reduce((sum, run) => sum + run.width, 0);

  // Shrink the module, never the ratios between bars — those are what a scanner
  // reads. Fractional widths are fine; SVG renders them exactly.
  const scale =
    maxWidth && modules * moduleWidth > maxWidth
      ? maxWidth / modules
      : moduleWidth;

  const width = modules * scale;

  let x = 0;

  return (
    <View style={styles.wrap}>
      <Svg width={width} height={height}>
        {runs.map((run, index) => {
          const rect = run.bar ? (
            <Rect
              key={index}
              x={x}
              y={0}
              width={run.width * scale}
              height={height}
              fill={color}
            />
          ) : null;

          x += run.width * scale;
          return rect;
        })}
      </Svg>

      {showValue && (
        <Text style={styles.value}>{displayValue ?? value}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {alignItems: 'center'},
  value: {
    marginTop: 4,
    fontSize: 12,
    letterSpacing: 1,
    color: '#111',
    fontWeight: '600',
  },
});

export default Barcode128;
