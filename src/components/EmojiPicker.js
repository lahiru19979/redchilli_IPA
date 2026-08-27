// components/EmojiPicker.js
//
// The panel behind the composer's smiley. It takes the keyboard's place, the
// way WhatsApp does it, rather than floating over the conversation.
//
// The emoji are plain unicode strings drawn by the system font. A picker
// library would bring its own sprite sheets and a native font, would need a
// rebuild to land, and would still show the OS emoji on Android — megabytes
// spent arriving at the glyphs already on the phone.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WaIcon from './WaIcon';
import { WA_LIGHT, WA_DARK } from '../utils/theme';

const RECENT_KEY = 'wa_emoji_recent';
const RECENT_MAX = 32;
const COLUMNS = 8;

// Tab glyph, then the emoji. Trimmed to what a keyboard-sized panel can show:
// the full unicode set runs to thousands, and most of that tail renders as
// tofu on older Android.
const CATEGORIES = [
  {
    id: 'smileys',
    tab: '\u{1F642}',
    label: 'Smileys',
    emoji: [
      '\u{1F600}', '\u{1F603}', '\u{1F604}', '\u{1F601}', '\u{1F606}', '\u{1F605}', '\u{1F923}', '\u{1F602}',
      '\u{1F642}', '\u{1F643}', '\u{1F609}', '\u{1F60A}', '\u{1F607}', '\u{1F970}', '\u{1F60D}', '\u{1F929}',
      '\u{1F618}', '\u{1F617}', '\u{1F61A}', '\u{1F619}', '\u{1F60B}', '\u{1F61B}', '\u{1F61C}', '\u{1F92A}',
      '\u{1F61D}', '\u{1F911}', '\u{1F917}', '\u{1F92D}', '\u{1F92B}', '\u{1F914}', '\u{1F910}', '\u{1F928}',
      '\u{1F610}', '\u{1F611}', '\u{1F636}', '\u{1F60F}', '\u{1F612}', '\u{1F644}', '\u{1F62C}', '\u{1F925}',
      '\u{1F60C}', '\u{1F614}', '\u{1F62A}', '\u{1F924}', '\u{1F634}', '\u{1F637}', '\u{1F912}', '\u{1F915}',
      '\u{1F922}', '\u{1F92E}', '\u{1F927}', '\u{1F975}', '\u{1F976}', '\u{1F974}', '\u{1F635}', '\u{1F92F}',
      '\u{1F920}', '\u{1F973}', '\u{1F978}', '\u{1F60E}', '\u{1F913}', '\u{1F9D0}', '\u{1F615}', '\u{1F61F}',
      '\u{1F641}', '\u{2639}️', '\u{1F62E}', '\u{1F62F}', '\u{1F632}', '\u{1F633}', '\u{1F97A}', '\u{1F626}',
      '\u{1F627}', '\u{1F628}', '\u{1F630}', '\u{1F625}', '\u{1F622}', '\u{1F62D}', '\u{1F631}', '\u{1F616}',
      '\u{1F623}', '\u{1F61E}', '\u{1F613}', '\u{1F629}', '\u{1F62B}', '\u{1F624}', '\u{1F621}', '\u{1F620}',
      '\u{1F92C}', '\u{1F608}', '\u{1F47F}', '\u{1F480}', '\u{1F4A9}', '\u{1F921}', '\u{1F479}', '\u{1F47B}',
    ],
  },
  {
    id: 'people',
    tab: '\u{1F44B}',
    label: 'People',
    emoji: [
      '\u{1F44B}', '\u{1F91A}', '\u{1F590}️', '✋', '\u{1F596}', '\u{1F44C}', '\u{1F90F}', '✌️',
      '\u{1F91E}', '\u{1F91F}', '\u{1F918}', '\u{1F919}', '\u{1F448}', '\u{1F449}', '\u{1F446}', '\u{1F447}',
      '☝️', '\u{1F44D}', '\u{1F44E}', '✊', '\u{1F44A}', '\u{1F91B}', '\u{1F91C}', '\u{1F44F}',
      '\u{1F64C}', '\u{1F450}', '\u{1F932}', '\u{1F91D}', '\u{1F64F}', '✍️', '\u{1F485}', '\u{1F4AA}',
      '\u{1F440}', '\u{1F441}️', '\u{1F445}', '\u{1F444}', '\u{1F476}', '\u{1F9D2}', '\u{1F466}', '\u{1F467}',
      '\u{1F9D1}', '\u{1F468}', '\u{1F469}', '\u{1F471}', '\u{1F474}', '\u{1F475}', '\u{1F46E}', '\u{1F477}',
      '\u{1F482}', '\u{1F575}️', '\u{1F64B}', '\u{1F926}', '\u{1F937}', '\u{1F481}', '\u{1F646}', '\u{1F645}',
      '\u{1F46B}', '\u{1F46A}', '\u{1F46C}', '\u{1F46D}', '\u{1F491}', '\u{1F48F}', '\u{1F464}', '\u{1F465}',
    ],
  },
  {
    id: 'nature',
    tab: '\u{1F436}',
    label: 'Nature',
    emoji: [
      '\u{1F436}', '\u{1F431}', '\u{1F42D}', '\u{1F439}', '\u{1F430}', '\u{1F98A}', '\u{1F43B}', '\u{1F43C}',
      '\u{1F428}', '\u{1F42F}', '\u{1F981}', '\u{1F42E}', '\u{1F437}', '\u{1F438}', '\u{1F435}', '\u{1F414}',
      '\u{1F427}', '\u{1F426}', '\u{1F424}', '\u{1F986}', '\u{1F985}', '\u{1F989}', '\u{1F98B}', '\u{1F41D}',
      '\u{1F41B}', '\u{1F41E}', '\u{1F577}️', '\u{1F422}', '\u{1F40D}', '\u{1F419}', '\u{1F420}', '\u{1F41F}',
      '\u{1F42C}', '\u{1F433}', '\u{1F40E}', '\u{1F984}', '\u{1F98C}', '\u{1F418}', '\u{1F42B}', '\u{1F992}',
      '\u{1F335}', '\u{1F332}', '\u{1F333}', '\u{1F334}', '\u{1F340}', '\u{1F33F}', '\u{1F343}', '\u{1F342}',
      '\u{1F341}', '\u{1F344}', '\u{1F33E}', '\u{1F490}', '\u{1F338}', '\u{1F339}', '\u{1F337}', '\u{1F33B}',
      '\u{1F31E}', '\u{1F31D}', '\u{1F31B}', '⭐', '\u{1F31F}', '✨', '⚡', '\u{1F525}',
      '\u{1F308}', '☁️', '⛅', '\u{1F326}️', '❄️', '\u{1F4A7}', '\u{1F30A}', '\u{1F30D}',
    ],
  },
  {
    id: 'food',
    tab: '\u{1F354}',
    label: 'Food',
    emoji: [
      '\u{1F34F}', '\u{1F34E}', '\u{1F350}', '\u{1F34A}', '\u{1F34B}', '\u{1F34C}', '\u{1F349}', '\u{1F347}',
      '\u{1F353}', '\u{1F352}', '\u{1F351}', '\u{1F96D}', '\u{1F34D}', '\u{1F965}', '\u{1F95D}', '\u{1F345}',
      '\u{1F346}', '\u{1F952}', '\u{1F955}', '\u{1F33D}', '\u{1F336}️', '\u{1F954}', '\u{1F35E}', '\u{1F950}',
      '\u{1F956}', '\u{1F9C0}', '\u{1F95A}', '\u{1F373}', '\u{1F953}', '\u{1F969}', '\u{1F357}', '\u{1F356}',
      '\u{1F32D}', '\u{1F354}', '\u{1F35F}', '\u{1F355}', '\u{1F32E}', '\u{1F32F}', '\u{1F959}', '\u{1F958}',
      '\u{1F35C}', '\u{1F35B}', '\u{1F363}', '\u{1F371}', '\u{1F35A}', '\u{1F359}', '\u{1F368}', '\u{1F372}',
      '\u{1F366}', '\u{1F367}', '\u{1F370}', '\u{1F382}', '\u{1F36B}', '\u{1F36C}', '\u{1F36A}', '\u{1F369}',
      '☕', '\u{1F375}', '\u{1F964}', '\u{1F37A}', '\u{1F377}', '\u{1F942}', '\u{1F379}', '\u{1F9C3}',
    ],
  },
  {
    id: 'activity',
    tab: '⚽',
    label: 'Activity',
    emoji: [
      '⚽', '\u{1F3C0}', '\u{1F3C8}', '⚾', '\u{1F3BE}', '\u{1F3D0}', '\u{1F3C9}', '\u{1F3B1}',
      '\u{1F3D3}', '\u{1F3F8}', '\u{1F945}', '\u{1F3AF}', '⛳', '\u{1F3BF}', '\u{1F6F9}', '\u{1F3CB}️',
      '\u{1F6B4}', '\u{1F3C3}', '\u{1F3CA}', '\u{1F93A}', '\u{1F3C6}', '\u{1F947}', '\u{1F948}', '\u{1F949}',
      '\u{1F3C5}', '\u{1F396}️', '\u{1F3AB}', '\u{1F3AC}', '\u{1F3A4}', '\u{1F3A7}', '\u{1F3B5}', '\u{1F3B6}',
      '\u{1F3B8}', '\u{1F3B9}', '\u{1F3BA}', '\u{1F941}', '\u{1F3AE}', '\u{1F579}️', '\u{1F3B2}', '\u{1F9E9}',
    ],
  },
  {
    id: 'travel',
    tab: '\u{1F697}',
    label: 'Travel',
    emoji: [
      '\u{1F697}', '\u{1F695}', '\u{1F699}', '\u{1F68C}', '\u{1F68E}', '\u{1F693}', '\u{1F691}', '\u{1F692}',
      '\u{1F69A}', '\u{1F69B}', '\u{1F69C}', '\u{1F3CD}️', '\u{1F6F5}', '\u{1F6B2}', '✈️', '\u{1F681}',
      '\u{1F680}', '\u{1F6F8}', '⛵', '\u{1F6A4}', '\u{1F6F3}️', '\u{1F6A2}', '\u{1F686}', '\u{1F683}',
      '\u{1F68B}', '\u{1F69D}', '\u{1F3E0}', '\u{1F3E2}', '\u{1F3EC}', '\u{1F3E5}', '\u{1F3E6}', '\u{1F3EA}',
      '\u{1F3E8}', '\u{1F492}', '⛪', '\u{1F5FC}', '\u{1F5FD}', '\u{1F309}', '\u{1F307}', '\u{1F306}',
      '\u{1F3D6}️', '\u{1F3DD}️', '\u{1F30B}', '⛰️', '\u{1F3D5}️', '\u{1F5FA}️', '\u{1F9ED}', '\u{1F5FF}',
    ],
  },
  {
    id: 'objects',
    tab: '\u{1F4A1}',
    label: 'Objects',
    emoji: [
      '⌚', '\u{1F4F1}', '\u{1F4BB}', '⌨️', '\u{1F5A5}️', '\u{1F5A8}️', '\u{1F4BE}', '\u{1F4BD}',
      '\u{1F4F7}', '\u{1F4F9}', '\u{1F4FA}', '\u{1F50D}', '\u{1F4A1}', '\u{1F526}', '\u{1F56F}️', '\u{1F4D4}',
      '\u{1F4D6}', '\u{1F4DD}', '✏️', '\u{1F4CE}', '\u{1F4CC}', '\u{1F4CD}', '✂️', '\u{1F5D1}️',
      '\u{1F512}', '\u{1F511}', '\u{1F528}', '\u{1F527}', '\u{1F529}', '⚙️', '\u{1F9F0}', '\u{1F9F2}',
      '\u{1F4B0}', '\u{1F4B5}', '\u{1F4B3}', '\u{1F9FE}', '\u{1F4E6}', '\u{1F4EB}', '✉️', '\u{1F4E9}',
      '\u{1F4C5}', '\u{1F4CA}', '\u{1F4C8}', '\u{1F4C9}', '\u{1F4CB}', '\u{1F4C1}', '\u{1F5C2}️', '\u{1F4DA}',
      '\u{1F48A}', '\u{1F489}', '\u{1F6CE}️', '\u{1F6D2}', '\u{1F381}', '\u{1F388}', '\u{1F389}', '\u{1F38A}',
    ],
  },
  {
    id: 'symbols',
    tab: '❤️',
    label: 'Symbols',
    emoji: [
      '❤️', '\u{1F9E1}', '\u{1F49B}', '\u{1F49A}', '\u{1F499}', '\u{1F49C}', '\u{1F5A4}', '\u{1F90D}',
      '\u{1F494}', '❣️', '\u{1F495}', '\u{1F49E}', '\u{1F493}', '\u{1F497}', '\u{1F496}', '\u{1F498}',
      '\u{1F4AF}', '\u{1F4A2}', '\u{1F4A5}', '\u{1F4AB}', '\u{1F4A6}', '\u{1F4A8}', '\u{1F573}️', '\u{1F4AC}',
      '✔️', '✅', '❌', '❗', '❓', '⚠️', '\u{1F6AB}', '\u{1F51E}',
      '\u{1F195}', '\u{1F193}', '\u{1F197}', '\u{1F199}', '\u{1F19A}', '♻️', '\u{1F532}', '\u{1F534}',
      '\u{1F535}', '\u{1F7E2}', '\u{1F7E1}', '\u{1F7E0}', '\u{1F7E3}', '⚫', '⚪', '\u{1F536}',
      '\u{1F51D}', '\u{1F51A}', '\u{1F502}', '▶️', '⏸️', '⏹️', '⏪', '⏩',
    ],
  },
];

const EmojiPicker = ({ dark, WA, height = 280, onPick, onBackspace }) => {
  const [recent, setRecent] = useState([]);
  const [tab, setTab] = useState('smileys');

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY)
      .then(raw => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (Array.isArray(saved)) {
          setRecent(saved.filter(e => typeof e === 'string'));
        }
      })
      // A missing or corrupt list is not worth a message: the picker just
      // opens with no recents.
      .catch(() => {});
  }, []);

  const pick = useCallback(
    emoji => {
      onPick(emoji);
      setRecent(prev => {
        const next = [emoji, ...prev.filter(e => e !== emoji)].slice(0, RECENT_MAX);
        AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [onPick],
  );

  // Recents only earn a tab once there is something in them, so a first-time
  // panel does not open on an empty grid.
  const tabs = useMemo(
    () =>
      recent.length
        ? [
            { id: 'recent', tab: '\u{1F551}', label: 'Recent', emoji: recent },
            ...CATEGORIES,
          ]
        : CATEGORIES,
    [recent],
  );

  const active = tabs.find(c => c.id === tab) || tabs[0];
  const styles = dark ? DARK : LIGHT;

  return (
    <View style={[styles.panel, { height }]}>
      <FlatList
        // Remounting on a tab change starts the grid at the top instead of
        // holding the previous category's scroll position.
        key={active.id}
        data={active.emoji}
        keyExtractor={(item, i) => `${active.id}-${i}`}
        numColumns={COLUMNS}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.cell} onPress={() => pick(item)}>
            <Text style={styles.emoji}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.tabBar}>
        {tabs.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[styles.tab, c.id === active.id && styles.tabOn]}
            onPress={() => setTab(c.id)}
            accessibilityLabel={c.label}
          >
            <Text style={styles.tabIcon}>{c.tab}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.tab}
          onPress={onBackspace}
          accessibilityLabel="Delete"
        >
          <WaIcon name="backspace" size={20} color={WA.icon} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStyles = T =>
  StyleSheet.create({
    panel: {
      backgroundColor: T.panel,
      borderTopWidth: 1,
      borderTopColor: T.divider,
    },
    grid: {
      paddingHorizontal: 6,
      paddingTop: 8,
      paddingBottom: 4,
    },
    cell: {
      width: `${100 / COLUMNS}%`,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Android clips tall emoji unless the line box is given the room.
    emoji: { fontSize: 26, lineHeight: 34 },
    tabBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: T.panelAlt,
      borderTopWidth: 1,
      borderTopColor: T.divider,
    },
    tab: {
      flex: 1,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabOn: { borderBottomColor: T.green },
    tabIcon: { fontSize: 18, lineHeight: 24 },
  });

// Both variants built once at module load, not per render, so scrolling the
// grid never rebuilds the sheet.
const LIGHT = makeStyles(WA_LIGHT);
const DARK = makeStyles(WA_DARK);

export default EmojiPicker;
