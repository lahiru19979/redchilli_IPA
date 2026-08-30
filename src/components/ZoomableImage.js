// components/ZoomableImage.js
//
// A photo you can pinch to zoom, drag around, double-tap to fill the screen,
// and swipe sideways to move to the next one — what a chat app's photo viewer
// is expected to do.
//
// Built on React Native's own PanResponder rather than a gesture library:
// react-native-gesture-handler is in package.json but has never been wired up
// (no GestureHandlerRootView anywhere), so using it would mean touching the app
// root and hoping the native side is linked. PanResponder is core, works on
// both platforms, and needs no rebuild.

import React, { useRef } from 'react';
import { View, Animated, PanResponder, StyleSheet } from 'react-native';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
// Anything slower or further than this was a drag, not a tap.
const TAP_MS = 250;
const TAP_SLOP = 12;
const DOUBLE_TAP_MS = 280;
// How far sideways counts as "next photo" rather than a wobble. A fraction of
// the screen, so it feels the same on a small phone and a tablet.
const SWIPE_FRACTION = 0.22;
const SWIPE_MIN = 60;

const clamp = (value, low, high) => Math.min(Math.max(value, low), high);

const ZoomableImage = ({ uri, onTap, onSwipeLeft, onSwipeRight }) => {
  // A ref, not state: the size is only read by the gesture maths, and setting
  // state on layout re-rendered the whole photo for nothing.
  const box = useRef({ width: 0, height: 0 }).current;

  const scale = useRef(new Animated.Value(1)).current;
  const translate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // The numbers behind those Animated values. Animated only exposes its current
  // value through a private getter, so the gesture keeps its own copy.
  const now = useRef({
    scale: 1,
    x: 0,
    y: 0,
    startScale: 1,
    startDistance: 0,
    startX: 0,
    startY: 0,
    downAt: 0,
    lastTapAt: 0,
    swiping: false,
  }).current;

  // How far the photo may be dragged before its edge comes past the screen's.
  const limit = zoom => ({
    x: Math.max((box.width * zoom - box.width) / 2, 0),
    y: Math.max((box.height * zoom - box.height) / 2, 0),
  });

  // Reused rather than allocated per frame: this runs on every touch move.
  const point = { x: 0, y: 0 };

  const apply = (nextScale, nextX, nextY) => {
    const bound = limit(nextScale);

    now.scale = nextScale;
    now.x = clamp(nextX, -bound.x, bound.x);
    now.y = clamp(nextY, -bound.y, bound.y);

    scale.setValue(now.scale);
    translate.setValue({ x: now.x, y: now.y });
  };

  const reset = (animated = true) => {
    now.scale = 1;
    now.x = 0;
    now.y = 0;
    now.startX = 0;
    now.startY = 0;

    if (!animated) {
      scale.setValue(1);
      translate.setValue({ x: 0, y: 0 });
      return;
    }

    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 0 }),
      Animated.spring(translate, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
        bounciness: 0,
      }),
    ]).start();
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      // Let a single finger through to the page until the photo is zoomed in;
      // dragging an unzoomed photo should do nothing.
      onMoveShouldSetPanResponder: (event, gesture) => {
        if (event.nativeEvent.touches.length === 2) return true;

        // Zoomed in, the finger moves the photo.
        if (now.scale > 1) {
          return Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2;
        }

        // Zoomed out, a clearly sideways drag turns the page. Vertical drags
        // are left alone so they never fight a swipe-down out of the viewer.
        return Math.abs(gesture.dx) > 3 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },

      onPanResponderGrant: () => {
        const at = Date.now();

        now.downAt = at;
        now.swiping = false;
        now.startScale = now.scale;
        now.startDistance = 0;
        now.startX = now.x;
        now.startY = now.y;

        if (at - now.lastTapAt < DOUBLE_TAP_MS) {
          now.lastTapAt = 0;

          if (now.scale > 1) {
            reset();
          } else {
            Animated.spring(scale, {
              toValue: DOUBLE_TAP_SCALE,
              useNativeDriver: true,
              bounciness: 0,
            }).start();
            now.scale = DOUBLE_TAP_SCALE;
          }

          return;
        }

        now.lastTapAt = at;
      },

      onPanResponderMove: (event, gesture) => {
        const touches = event.nativeEvent.touches;

        if (touches.length === 2) {
          const distance = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY,
          );

          // The first move of a pinch only establishes the starting span.
          if (!now.startDistance) {
            now.startDistance = distance;
            now.startScale = now.scale;
            return;
          }

          apply(
            clamp(now.startScale * (distance / now.startDistance), 1, MAX_SCALE),
            now.x,
            now.y,
          );
          return;
        }

        if (now.scale > 1) {
          apply(now.scale, now.startX + gesture.dx, now.startY + gesture.dy);
          return;
        }

        // Follows the finger, so it is obvious a photo is being dragged aside
        // rather than the tap having missed.
        if (onSwipeLeft || onSwipeRight) {
          now.swiping = true;
          point.x = gesture.dx;
          point.y = 0;
          translate.setValue(point);
        }
      },

      onPanResponderRelease: (event, gesture) => {
        const quick = Date.now() - now.downAt < TAP_MS;
        const still =
          Math.abs(gesture.dx) < TAP_SLOP && Math.abs(gesture.dy) < TAP_SLOP;

        now.startDistance = 0;
        now.startX = now.x;
        now.startY = now.y;

        if (now.swiping) {
          now.swiping = false;

          const far = Math.max(box.width * SWIPE_FRACTION, SWIPE_MIN);
          const next = gesture.dx <= -far && onSwipeLeft;
          const previous = gesture.dx >= far && onSwipeRight;

          // The parent swaps the photo, and this component is keyed on it, so a
          // fresh one mounts centred. Only a swipe that goes nowhere — the last
          // photo, or too short — has to spring back.
          if (next) {
            onSwipeLeft();
          } else if (previous) {
            onSwipeRight();
          } else {
            reset();
          }

          return;
        }

        // Pinching back out below 1 snaps home rather than leaving a photo
        // floating in the middle of a black screen.
        if (now.scale <= 1.02) {
          reset();
        }

        // A plain tap on an unzoomed photo still closes the viewer.
        if (quick && still && now.scale <= 1.02 && onTap) onTap();
      },

      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  return (
    <View
      style={styles.container}
      onLayout={e => {
        box.width = e.nativeEvent.layout.width;
        box.height = e.nativeEvent.layout.height;
      }}
      {...responder.panHandlers}
    >
      <Animated.Image
        source={{ uri }}
        style={[
          styles.image,
          {
            transform: [
              { translateX: translate.x },
              { translateY: translate.y },
              { scale },
            ],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  image: { flex: 1, width: '100%' },
});

export default React.memo(ZoomableImage);
