import React, {useEffect, useState} from 'react';
import {KeyboardAvoidingView, Keyboard} from 'react-native';

/**
 * KeyboardAvoidingView with two problems fixed.
 *
 * The first is a bug in React Native itself: on Android it subscribes
 * keyboardDidHide to its _onKeyboardChange handler rather than its hide
 * handler, so hiding the keyboard is treated as a change of keyboard. It then
 * recomputes padding from the hide event instead of clearing it, and because an
 * edge-to-edge window reports that event's keyboard top above the navigation
 * bar, it settles on a permanent gap the height of that bar. Driving `enabled`
 * from our own listeners forces its render to zero, whatever its internal state
 * decided.
 *
 * The second is cost. Keeping that flag in the screen would re-render the whole
 * screen on every keyboard toggle, and a chat screen's list is expensive to
 * rebuild. Holding it here means only this component re-renders: `children`
 * arrives as the same element references it had before, so React leaves those
 * subtrees alone.
 */
export default function KeyboardAvoider({children, ...props}) {
  const [keyboardUp, setKeyboardUp] = useState(false);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () =>
      setKeyboardUp(true),
    );
    const hidden = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardUp(false),
    );

    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView {...props} enabled={keyboardUp}>
      {children}
    </KeyboardAvoidingView>
  );
}
