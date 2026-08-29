// components/AppHeader.js
//
// The app's screen header.
//
// The stack is a native-stack, whose header is drawn by react-native-screens on
// the native side: its height and the space it leaves for the status bar are not
// options JS can set — `headerStatusBarHeight` does not exist in native-stack,
// which is why setting it changed nothing. Drawing the header here instead puts
// that spacing back under our control.
//
// It reads the same `options` a screen already sets (title, headerStyle,
// headerTintColor, headerRight, headerTitle, headerTitleAlign), so no screen has
// to know it changed.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../utils/theme';

// Added on top of the measured status bar height, so the title clears the clock
// on any phone rather than being a guess at where the bar ends.
export const HEADER_GAP = 8;

const BAR_HEIGHT = 52;
// Reserved at both ends: the back arrow on one side, header buttons on the
// other, and the title centred in what is left over — which is the screen's
// centre as long as both ends reserve the same.
const SIDE = 52;
const HIT = { top: 10, bottom: 10, left: 10, right: 10 };

const BackArrow = ({ color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24">
    <Path
      fill={color}
      d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z"
    />
  </Svg>
);

const AppHeader = ({ navigation, route, options, back }) => {
  const insets = useSafeAreaInsets();

  const background = options.headerStyle?.backgroundColor || C.accent;
  const tint = options.headerTintColor || '#fff';
  const centred = (options.headerTitleAlign || 'center') === 'center';
  const label = options.title ?? route.name;

  // A screen can hand over its own title — the WhatsApp thread puts the
  // customer's avatar beside the name that way.
  const title =
    typeof options.headerTitle === 'function' ? (
      options.headerTitle({ tintColor: tint, children: label })
    ) : (
      <Text
        numberOfLines={1}
        style={[
          styles.title,
          { color: tint },
          centred && styles.titleCentred,
          options.headerTitleStyle,
        ]}
      >
        {typeof options.headerTitle === 'string' ? options.headerTitle : label}
      </Text>
    );

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: background, paddingTop: insets.top + HEADER_GAP },
      ]}
    >
      <View style={styles.row}>
        {back ? (
          <TouchableOpacity
            style={styles.side}
            onPress={navigation.goBack}
            accessibilityLabel="Go back"
            hitSlop={HIT}
          >
            <BackArrow color={tint} />
          </TouchableOpacity>
        ) : (
          // Holds the title in the same place whether or not there is a back
          // arrow, so it does not shift as you move between screens.
          <View style={styles.side} />
        )}

        {centred ? (
          <View style={styles.spacer} />
        ) : (
          <View style={styles.middle}>{title}</View>
        )}

        <View style={styles.right}>
          {options.headerRight ? options.headerRight({ tintColor: tint }) : null}
        </View>

        {/* A centred title has to be centred on the screen, not in what is left
            between the back arrow and the header buttons — laid out in the row
            it drifts sideways by however wide those buttons happen to be. The
            same inset on both sides puts its middle on the screen's middle. */}
        {centred && (
          <View style={styles.centreOverlay} pointerEvents="none">
            {title}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    paddingBottom: 6,
  },
  row: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    width: SIDE,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1, minWidth: 0, justifyContent: 'center' },
  spacer: { flex: 1 },
  centreOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: SIDE,
    right: SIDE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold' },
  titleCentred: { textAlign: 'center' },
});

export default AppHeader;
