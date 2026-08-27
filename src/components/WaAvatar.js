// components/WaAvatar.js
//
// The round initial that stands in for a customer's photo. Shared by the chat
// list and the thread header so the same person is the same colour in both —
// the tint is picked from the customer id, not at random, so it also survives
// re-sorting and reloads.

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

// Muted, WhatsApp-ish tints. A bright colour wheel pulls the eye away from the
// unread badges, which are what actually matter in the list.
export const AVATAR_COLORS = [
  '#6B7C93',
  '#4E8098',
  '#7A6C9B',
  '#A1795A',
  '#4F8A6B',
  '#95627B',
  '#5C7A99',
];

export const avatarColor = id =>
  AVATAR_COLORS[Math.abs(Number(id) || 0) % AVATAR_COLORS.length];

const WaAvatar = ({ id, name, image, size = 50, style }) => {
  const round = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (image) {
    return <Image source={{ uri: image }} style={[styles.base, round, style]} />;
  }

  return (
    <View
      style={[styles.base, round, { backgroundColor: avatarColor(id) }, style]}
    >
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>
        {(name || '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: { color: '#fff', fontWeight: '600' },
});

export default WaAvatar;
