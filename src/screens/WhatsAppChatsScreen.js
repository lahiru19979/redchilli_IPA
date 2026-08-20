// screens/WhatsAppChatsScreen.js
//
// The WhatsApp inbox: every chat, newest activity first. Mirrors the web CRM's
// sidebar — unread badges, message previews, pinned chats on top — and polls so
// new messages surface without a manual refresh.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { whatsappAPI } from '../api/apiClient';
import LoadingSpinner from '../components/LoadingSpinner';
import { C } from '../utils/theme';

const AVATAR_COLORS = [
  '#F56A6A',
  '#4FB0C6',
  '#7D6FE8',
  '#E8A23D',
  '#4FC08D',
  '#E85D8A',
  '#5B8DEF',
];

const WhatsAppChatsScreen = ({ navigation }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [starting, setStarting] = useState(false);

  // The chat whose options sheet is open, plus which list we are looking at.
  const [menuChat, setMenuChat] = useState(null);
  const [view, setView] = useState('');
  const [busyAction, setBusyAction] = useState(false);

  const [labels, setLabels] = useState([]);
  const [activeLabel, setActiveLabel] = useState('');
  const [labelSheet, setLabelSheet] = useState(null); // chat being labelled
  const [appliedLabels, setAppliedLabels] = useState([]);
  const [labelError, setLabelError] = useState('');

  // Held in a ref so the poll always sees the current term without being
  // re-created (and restarted) on every keystroke.
  const searchRef = useRef('');
  searchRef.current = search;
  const viewRef = useRef('');
  viewRef.current = view;
  const labelRef = useRef('');
  labelRef.current = activeLabel;

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => setNewChatOpen(true)}
        >
          <Text style={styles.headerBtnText}>New</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const load = useCallback(async (pageNo = 1, term = '', which = '', label = '') => {
    const res = await whatsappAPI.getChats(pageNo, term, which, label);
    const data = res.data;

    setHasMore(!!data.has_more);
    setPage(data.current_page || pageNo);
    setChats(prev => (pageNo === 1 ? data.data : [...prev, ...data.data]));
  }, []);

  useEffect(() => {
    // Debounced so typing doesn't fire a request per character.
    const handle = setTimeout(() => {
      setLoading(true);
      load(1, search, view, activeLabel)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(handle);
  }, [search, view, activeLabel, load]);

  // Refresh whenever the screen regains focus (e.g. coming back from a thread,
  // where messages will have been marked read) and every 5s while it is open.
  useFocusEffect(
    useCallback(() => {
      load(1, searchRef.current, viewRef.current, labelRef.current).catch(() => {});

      const timer = setInterval(() => {
        load(1, searchRef.current, viewRef.current, labelRef.current).catch(() => {});
      }, 5000);

      return () => clearInterval(timer);
    }, [load]),
  );

  const startChat = async () => {
    const phone = newPhone.trim();
    if (!phone || starting) return;

    setStarting(true);

    try {
      const res = await whatsappAPI.startChat(phone, newName.trim());
      const customer = res.data.customer;

      setNewChatOpen(false);
      setNewPhone('');
      setNewName('');

      navigation.navigate('WhatsAppThread', {
        customerId: customer.id,
        name: customer.name,
        phone: customer.phone,
      });
    } catch (error) {
      Alert.alert(
        'Could not start chat',
        error?.response?.data?.message || 'Please check the number and try again.',
      );
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    whatsappAPI
      .getLabels()
      .then(res => setLabels(res.data.labels || []))
      .catch(error => {
        // Swallowing this made a missing endpoint look identical to having no
        // labels at all, which is impossible to diagnose from the phone.
        setLabelError(
          error?.response?.status
            ? `Labels unavailable (HTTP ${error.response.status})`
            : 'Labels unavailable - no connection',
        );
      });
  }, []);

  const openLabelSheet = async chat => {
    setLabelSheet(chat);
    setMenuChat(null);

    try {
      const res = await whatsappAPI.getLabels(chat.id);
      setAppliedLabels((res.data.applied || []).map(String));
    } catch (error) {
      setAppliedLabels([]);
    }
  };

  const toggleLabel = async label => {
    if (!labelSheet) return;

    const on = appliedLabels.includes(String(label.id));

    // Optimistic: the sheet stays responsive while the request is in flight.
    setAppliedLabels(prev =>
      on
        ? prev.filter(id => id !== String(label.id))
        : [...prev, String(label.id)],
    );

    try {
      await whatsappAPI.toggleLabel(labelSheet.id, label.id, !on);
      await load(1, search, view, activeLabel);
    } catch (error) {
      // Put it back the way it was if the server refused.
      setAppliedLabels(prev =>
        on
          ? [...prev, String(label.id)]
          : prev.filter(id => id !== String(label.id)),
      );
      Alert.alert('Could not update label', 'Please try again.');
    }
  };

  const runAction = async (action, value = true) => {
    if (!menuChat || busyAction) return;

    setBusyAction(true);

    try {
      await whatsappAPI.chatAction(menuChat.id, action, value);
      setMenuChat(null);
      await load(1, search, view, activeLabel);
    } catch (error) {
      Alert.alert(
        'Action failed',
        error?.response?.data?.message || 'Please try again.',
      );
    } finally {
      setBusyAction(false);
    }
  };

  const confirmDestructive = (action, title, body) => {
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: title,
        style: 'destructive',
        onPress: () => runAction(action),
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load(1, search, view, activeLabel).catch(() => {});
    setRefreshing(false);
  };

  const onEndReached = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await load(page + 1, search, view, activeLabel).catch(() => {});
    setLoadingMore(false);
  };

  const timeLabel = iso => {
    if (!iso) return '';
    const d = new Date(iso.replace(' ', 'T'));
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();

    return sameDay
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const renderChat = ({ item }) => {
    const color = AVATAR_COLORS[item.id % AVATAR_COLORS.length];
    const initial = (item.name || '?').charAt(0).toUpperCase();

    return (
      <TouchableOpacity
        style={styles.row}
        onLongPress={() => setMenuChat(item)}
        delayLongPress={300}
        onPress={() =>
          navigation.navigate('WhatsAppThread', {
            customerId: item.id,
            name: item.name,
            phone: item.phone,
          })
        }
      >
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        <View style={styles.rowBody}>
          <View style={styles.rowLine}>
            <Text style={styles.name} numberOfLines={1}>
              {item.pinned ? '📌 ' : ''}
              {item.favorite ? '⭐ ' : ''}
              {item.muted ? '🔇 ' : ''}
              {item.name}
            </Text>
            <Text style={styles.time}>{timeLabel(item.last_at)}</Text>
          </View>

          <View style={styles.rowLine}>
            <Text style={styles.preview} numberOfLines={1}>
              {item.preview || item.phone}
            </Text>
            {item.unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unread}</Text>
              </View>
            )}
          </View>

          {item.labels?.length > 0 && (
            <View style={styles.labelRow}>
              {item.labels.map((l, i) => (
                <View
                  key={i}
                  style={[styles.labelChip, { backgroundColor: l.color }]}
                >
                  <Text style={styles.labelText}>{l.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !chats.length) {
    return <LoadingSpinner message="Loading chats..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, phone or message"
          placeholderTextColor={C.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.viewTabs}>
        {[
          ['', 'Chats'],
          ['unread', 'Unread'],
          ['favorites', 'Favourites'],
          ['archived', 'Archived'],
        ].map(([key, label]) => (
          <TouchableOpacity
            key={key || 'inbox'}
            style={[
              styles.viewTab,
              styles.viewTabSpacing,
              view === key && styles.viewTabActive,
            ]}
            onPress={() => setView(key)}
          >
            <Text
              style={[
                styles.viewTabText,
                view === key && styles.viewTabTextActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!!labelError && <Text style={styles.labelError}>{labelError}</Text>}

      {labels.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.labelBar}
          contentContainerStyle={styles.labelBarContent}
        >
          {labels.map(l => {
            const on = String(activeLabel) === String(l.id);
            return (
              <TouchableOpacity
                key={l.id}
                style={[
                  styles.labelPill,
                  on && { backgroundColor: l.color, borderColor: l.color },
                ]}
                onPress={() => setActiveLabel(on ? '' : l.id)}
              >
                <View style={[styles.labelDot, { backgroundColor: on ? '#fff' : l.color }]} />

                <Text
                  style={[styles.labelPillText, on && styles.labelPillTextOn]}
                  numberOfLines={1}
                >
                  {l.name}
                </Text>

                <View style={[styles.labelCount, on && styles.labelCountOn]}>
                  <Text
                    style={[styles.labelCountText, on && styles.labelPillTextOn]}
                  >
                    {l.customers_count ?? 0}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <FlatList
        data={chats}
        keyExtractor={item => String(item.id)}
        renderItem={renderChat}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <Text style={styles.empty}>No chats found.</Text>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footer} color={C.accent} />
          ) : null
        }
      />

      <Modal
        visible={!!menuChat}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuChat(null)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setMenuChat(null)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {menuChat?.name}
            </Text>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => runAction('archive', !menuChat.archived)}
            >
              <Text style={styles.sheetText}>
                {menuChat?.archived ? 'Unarchive chat' : 'Archive chat'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => runAction('mute', !menuChat.muted)}
            >
              <Text style={styles.sheetText}>
                {menuChat?.muted ? 'Unmute notifications' : 'Mute notifications'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => runAction('pin', !menuChat.pinned)}
            >
              <Text style={styles.sheetText}>
                {menuChat?.pinned ? 'Unpin chat' : 'Pin chat'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => runAction('mark_unread', !menuChat.marked_unread)}
            >
              <Text style={styles.sheetText}>
                {menuChat?.marked_unread ? 'Mark as read' : 'Mark as unread'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => runAction('favorite', !menuChat.favorite)}
            >
              <Text style={styles.sheetText}>
                {menuChat?.favorite ? 'Remove from favourites' : 'Add to favourites'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => openLabelSheet(menuChat)}
            >
              <Text style={styles.sheetText}>Labels...</Text>
            </TouchableOpacity>

            <View style={styles.sheetDivider} />

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() =>
                confirmDestructive(
                  'block',
                  menuChat?.blocked ? 'Unblock' : 'Block',
                  menuChat?.blocked
                    ? 'Allow this customer to message you again?'
                    : 'Block this customer on WhatsApp? Their messages will stop arriving.',
                )
              }
            >
              <Text style={styles.sheetDanger}>
                {menuChat?.blocked ? 'Unblock' : 'Block'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() =>
                confirmDestructive(
                  'clear',
                  'Clear chat',
                  'Remove every message from this thread? The chat stays in your list.',
                )
              }
            >
              <Text style={styles.sheetDanger}>Clear chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() =>
                confirmDestructive(
                  'delete',
                  'Delete chat',
                  'Remove this chat from the inbox? The customer record is kept.',
                )
              }
            >
              <Text style={styles.sheetDanger}>Delete chat</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={!!labelSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setLabelSheet(null)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setLabelSheet(null)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              Labels for {labelSheet?.name}
            </Text>

            {labels.map(l => {
              const on = appliedLabels.includes(String(l.id));
              return (
                <TouchableOpacity
                  key={l.id}
                  style={styles.labelRowItem}
                  onPress={() => toggleLabel(l)}
                >
                  <View style={[styles.labelDot, { backgroundColor: l.color }]} />
                  <Text style={styles.sheetText}>{l.name}</Text>
                  <Text style={styles.labelCheck}>{on ? '✓' : ''}</Text>
                </TouchableOpacity>
              );
            })}

            <Text style={styles.labelHint}>
              Create or rename labels from the web CRM.
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={newChatOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNewChatOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Chat</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="0771234567 or 94771234567"
              placeholderTextColor={C.textSecondary}
              keyboardType="phone-pad"
              value={newPhone}
              onChangeText={setNewPhone}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Name (optional)"
              placeholderTextColor={C.textSecondary}
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.modalHint}>
              If this number is already saved, its existing chat opens instead of
              creating a duplicate.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setNewChatOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalPrimary, starting && styles.disabled]}
                onPress={startChat}
                disabled={starting}
              >
                {starting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalPrimaryText}>Start Chat</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.surface },
  searchWrap: {
    padding: 12,
    backgroundColor: C.bgAlt,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  searchInput: {
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: C.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  rowBody: { flex: 1, minWidth: 0 },
  rowLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: { flex: 1, fontWeight: '600', fontSize: 15, color: C.text },
  time: { fontSize: 11.5, color: C.textSecondary, marginLeft: 8 },
  preview: { flex: 1, fontSize: 13, color: C.textSecondary, marginTop: 2 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  labelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  labelChip: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  labelText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  empty: { textAlign: 'center', color: C.textSecondary, marginTop: 40 },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  viewTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: C.bgAlt,
  },
  viewTabSpacer: { width: 8 },
  viewTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: C.surface,
  },
  viewTabSpacing: { marginRight: 8 },
  viewTabActive: { backgroundColor: '#25D366' },
  viewTabText: { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  viewTabTextActive: { color: '#fff' },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 8,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textSecondary,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sheetItem: { paddingHorizontal: 20, paddingVertical: 14 },
  sheetText: { fontSize: 15, color: C.text },
  sheetDanger: { fontSize: 15, color: C.danger },
  labelBar: {
    // A fixed height stops the bar collapsing or stretching as pills wrap.
    height: 44,
    flexGrow: 0,
    backgroundColor: C.bgAlt,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  labelBarContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  labelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    paddingLeft: 10,
    paddingRight: 6,
    height: 30,
    marginRight: 6,
    backgroundColor: C.surface,
  },
  labelPillText: {
    fontSize: 12.5,
    color: C.textSecondary,
    fontWeight: '600',
    maxWidth: 130,
  },
  labelPillTextOn: { color: '#fff' },
  labelDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  labelCount: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    marginLeft: 6,
    backgroundColor: C.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelCountOn: { backgroundColor: 'rgba(255,255,255,0.3)' },
  labelCountText: { fontSize: 11, fontWeight: '700', color: C.textSecondary },
  labelRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  labelCheck: { flex: 1, textAlign: 'right', color: '#25D366', fontWeight: '700' },
  labelError: {
    fontSize: 12,
    color: C.danger,
    paddingHorizontal: 14,
    paddingBottom: 6,
    backgroundColor: C.bgAlt,
  },
  labelHint: {
    fontSize: 12,
    color: C.textSecondary,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: C.divider,
    marginVertical: 6,
  },
  headerBtnText: { color: C.accent, fontWeight: '700', fontSize: 15 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { backgroundColor: C.surface, borderRadius: 12, padding: 18 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 12 },
  modalInput: {
    backgroundColor: C.bgAlt,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14.5,
    color: C.text,
    marginBottom: 10,
  },
  modalHint: { fontSize: 12, color: C.textSecondary, marginBottom: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancel: { paddingHorizontal: 14, paddingVertical: 10 },
  modalCancelText: { color: C.textSecondary, fontWeight: '600' },
  modalPrimary: {
    backgroundColor: '#25D366',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 104,
    alignItems: 'center',
  },
  modalPrimaryText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  footer: { marginVertical: 14 },
});

export default WhatsAppChatsScreen;
