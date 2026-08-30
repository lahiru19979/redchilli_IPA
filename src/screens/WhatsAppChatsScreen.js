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
import WaIcon from '../components/WaIcon';
import { C, WA_LIGHT, WA_DARK } from '../utils/theme';
import { useWaTheme, setWaThemeMode } from '../utils/waTheme';
import WaAvatar from '../components/WaAvatar';
import DateTimeField from '../components/DateTimeField';

// What a label can be coloured. The first seven are the defaults the server
// seeds, so a label made here looks like one made on the web.
const LABEL_COLORS = [
  '#22c55e',
  '#3b82f6',
  '#eab308',
  '#f97316',
  '#a855f7',
  '#ef4444',
  '#111827',
  '#06b6d4',
  '#ec4899',
  '#64748b',
];

// The job filter's pills, in the order the web CRM shows them.
const JOB_STATUSES = [
  ['ongoing', 'On-going', '#2563EB'],
  ['delay', 'Delay', '#E0333F'],
  ['completed', 'Completed', '#1DA13B'],
];

// 2026-08-30 -> 30 Aug, which is all the range button has room for.
const shortDate = value => {
  if (!value) return '';
  const parsed = new Date(`${value}T00:00:00`);

  return isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

const WhatsAppChatsScreen = ({ navigation }) => {
  // Follows the phone's appearance setting. Shadowing WA and styles
  // here means every reference below switches with it, untouched.
  const { dark, mode, WA } = useWaTheme();

  // Three-way, like WhatsApp's own Theme setting: follow the phone, or pin it
  // light or dark.
  const THEME_MODES = [
    ['system', 'auto', 'System default'],
    ['light', 'sun', 'Light'],
    ['dark', 'moon', 'Dark'],
  ];
  const styles = dark ? DARK_STYLES : LIGHT_STYLES;

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [starting, setStarting] = useState(false);

  // The chat whose options sheet is open, plus which list we are looking at.
  const [menuChat, setMenuChat] = useState(null);
  const [view, setView] = useState('');
  const [busyAction, setBusyAction] = useState(false);

  // Chats / Unread / Favourites / Archived totals, sent with every chat page.
  const [viewCounts, setViewCounts] = useState({
    chats: 0,
    unread: 0,
    favorites: 0,
    archived: 0,
  });

  // The job filter, as the web CRM's top bar: status, an optional delivery
  // date range, and the totals behind each pill.
  const [jobStatus, setJobStatus] = useState('');
  const [jobFrom, setJobFrom] = useState('');
  const [jobTo, setJobTo] = useState('');
  const [jobDatesOpen, setJobDatesOpen] = useState(false);
  const [canFilterJobs, setCanFilterJobs] = useState(false);
  const [jobCounts, setJobCounts] = useState({
    ongoing: 0,
    delay: 0,
    completed: 0,
  });

  const [labels, setLabels] = useState([]);
  const [activeLabel, setActiveLabel] = useState('');
  const [labelSheet, setLabelSheet] = useState(null); // chat being labelled
  // The label manager: the list itself, and the one being written.
  const [manageOpen, setManageOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState(LABEL_COLORS[0]);
  const [savingLabel, setSavingLabel] = useState(false);
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
  const pageRef = useRef(1);
  pageRef.current = page;
  const jobRef = useRef({ status: '', from: '', to: '' });
  jobRef.current = { status: jobStatus, from: jobFrom, to: jobTo };

  useEffect(() => {
    navigation.setOptions({
      // The navigator paints every header blue; these two screens follow
      // the phone's theme instead, so a dark chat list is not topped by a
      // bright blue bar.
      headerStyle: { backgroundColor: WA.headerBg },
      headerTintColor: '#fff',
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => setMenuOpen(true)}
          accessibilityLabel="More options"
          hitSlop={HIT}
        >
          <WaIcon name="more" size={21} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, WA, styles.headerBtn]);

  const load = useCallback(
    async (pageNo = 1, term = '', which = '', label = '', job = null) => {
      const filter = job || jobRef.current;
      const res = await whatsappAPI.getChats(pageNo, term, which, label, filter);

      // A reply for a filter the agent has already moved away from would repopulate
      // the list with the wrong chats — which is what made tapping Unread or a
      // label look like it did nothing when a poll was already in flight.
      const now = jobRef.current;
      const stale =
        `${term}|${which}|${label}|${filter.status}|${filter.from}|${filter.to}`
        !== `${searchRef.current}|${viewRef.current}|${labelRef.current}|${now.status}|${now.from}|${now.to}`;

      if (stale) return;

      const data = res.data;

      if (data.view_counts) setViewCounts(data.view_counts);
      if (data.job_status_counts) setJobCounts(data.job_status_counts);
      setCanFilterJobs(!!data.can_filter_jobs);

      setHasMore(!!data.has_more);
      setPage(data.current_page || pageNo);
      setChats(prev => (pageNo === 1 ? data.data : [...prev, ...data.data]));
    },
    [],
  );

  useEffect(() => {
    // Debounced so typing doesn't fire a request per character.
    const handle = setTimeout(() => {
      setLoading(true);
      load(1, search, view, activeLabel)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(handle);
  }, [search, view, activeLabel, jobStatus, jobFrom, jobTo, load]);

  // Refresh whenever the screen regains focus (e.g. coming back from a thread,
  // where messages will have been marked read) and every 3s while it is open.
  useFocusEffect(
    useCallback(() => {
      load(1, searchRef.current, viewRef.current, labelRef.current).catch(() => {});

      const timer = setInterval(() => {
        // Polling page 1 replaces the whole list, so it would throw away the
        // pages the agent has already scrolled through. Hold off until they are
        // back at the top (or pull to refresh).
        if (pageRef.current > 1) return;

        load(1, searchRef.current, viewRef.current, labelRef.current).catch(() => {});
      }, 3000);

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

  const loadLabels = useCallback(async () => {
    try {
      const res = await whatsappAPI.getLabels();
      setLabels(res.data.labels || []);
      setLabelError('');
    } catch (error) {
      // Swallowing this made a missing endpoint look identical to having no
      // labels at all, which is impossible to diagnose from the phone.
      setLabelError(
        error?.response?.status
          ? `Labels unavailable (HTTP ${error.response.status})`
          : 'Labels unavailable - no connection',
      );
    }
  }, []);

  useEffect(() => {
    loadLabels();
  }, [loadLabels]);

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

  const startLabel = label => {
    setEditingLabel(label || { id: null });
    setLabelName(label?.name || '');
    setLabelColor(label?.color || LABEL_COLORS[0]);
  };

  const saveLabel = async () => {
    const name = labelName.trim();

    if (!name) {
      setLabelError('Give the label a name.');
      return;
    }

    setSavingLabel(true);
    setLabelError('');

    try {
      await whatsappAPI.saveLabel({
        id: editingLabel?.id || undefined,
        name,
        color: labelColor,
      });

      setEditingLabel(null);
      await loadLabels();
    } catch (error) {
      setLabelError(
        error?.response?.data?.message || 'Could not save that label.',
      );
    } finally {
      setSavingLabel(false);
    }
  };

  const removeLabel = label =>
    Alert.alert(
      `Delete "${label.name}"?`,
      'The chats keep existing — they just lose this tag.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await whatsappAPI.deleteLabel(label.id);
              // A filter pinned to the label that just went would show nothing.
              if (String(activeLabel) === String(label.id)) setActiveLabel('');
              await loadLabels();
            } catch (error) {
              setLabelError('Could not delete that label.');
            }
          },
        },
      ],
    );

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
      // The pill counts come from the labels endpoint, so they go stale unless
      // it is asked again after a change.
      await Promise.all([load(1, search, view, activeLabel), loadLabels()]);
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

  const clearFilters = () => {
    setView('');
    setActiveLabel('');
    setSearch('');
  };

  const filtersOn = !!view || !!activeLabel || !!search.trim();

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
        <WaAvatar id={item.id} name={item.name} size={50} style={styles.avatar} />

        <View style={styles.rowBody}>
          <View style={styles.rowLine}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text
              style={[styles.time, item.unread > 0 && styles.timeUnread]}
            >
              {timeLabel(item.last_at)}
            </Text>
          </View>

          <View style={styles.rowLine}>
            <Text
              style={[styles.preview, item.unread > 0 && styles.previewUnread]}
              numberOfLines={1}
            >
              {item.preview || item.phone}
            </Text>

            {/* Status icons sit on the right, WhatsApp-style, rather than as
                emoji crowding the start of the name. */}
            <View style={styles.rowIcons}>
              {item.muted && (
                <WaIcon name="mute" size={15} color={WA.iconMuted} />
              )}
              {item.favorite && (
                <WaIcon name="star" size={15} color={WA.iconMuted} />
              )}
              {item.pinned && (
                <WaIcon name="pin" size={15} color={WA.iconMuted} />
              )}

              {item.unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unread}</Text>
                </View>
              )}
            </View>
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
        <View style={styles.searchField}>
          <WaIcon name="search" size={18} color={WA.iconMuted} />

          <TextInput
            style={styles.searchInput}
            placeholder="Search name, phone or message"
            placeholderTextColor={WA.iconMuted}
            value={search}
            onChangeText={setSearch}
          />

          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={HIT}>
              <WaIcon name="close" size={18} color={WA.iconMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.viewTabs}>
        {[
          ['', 'Chats'],
          ['unread', 'Unread'],
          ['favorites', 'Favourites'],
          ['archived', 'Archived'],
        ].map(([key, label]) => {
          // No count on Chats: it is every conversation there is, which tells
          // nobody anything the other three do not.
          const total = key ? viewCounts[key] ?? 0 : null;

          return (
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
                {total === null ? label : `${label} (${total})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* The job filter, same as the web CRM's top bar: which of this
          customer's jobs are running, late or done, over an optional delivery
          date range. Only for people who may see job cards at all. */}
      {canFilterJobs && (
        <View style={styles.jobBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.jobBarContent}
          >
            {JOB_STATUSES.map(([key, label, colour]) => {
              const on = jobStatus === key;

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.jobPill,
                    on && { backgroundColor: colour, borderColor: colour },
                  ]}
                  onPress={() => setJobStatus(on ? '' : key)}
                >
                  <Text
                    style={[styles.jobPillText, on && styles.jobPillTextOn]}
                  >
                    {label}
                  </Text>
                  <View style={[styles.jobCount, on && styles.jobCountOn]}>
                    <Text
                      style={[styles.jobCountText, on && styles.jobPillTextOn]}
                    >
                      {jobCounts[key] ?? 0}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.jobPill, (jobFrom || jobTo) && styles.jobPillOn]}
              onPress={() => setJobDatesOpen(true)}
            >
              <Text
                style={[
                  styles.jobPillText,
                  (jobFrom || jobTo) && styles.jobPillTextOn,
                ]}
              >
                {jobFrom || jobTo
                  ? `${shortDate(jobFrom) || 'Any'} – ${shortDate(jobTo) || 'Any'}`
                  : 'Dates'}
              </Text>
            </TouchableOpacity>

            {(jobStatus || jobFrom || jobTo) && (
              <TouchableOpacity
                style={styles.jobClear}
                onPress={() => {
                  setJobStatus('');
                  setJobFrom('');
                  setJobTo('');
                }}
              >
                <WaIcon name="close" size={14} color={WA.icon} />
                <Text style={styles.jobClearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      {/* Every label on screen, scrolled sideways — not tucked behind a menu. */}
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
                <View
                  style={[
                    styles.labelDot,
                    { backgroundColor: on ? '#fff' : l.color },
                  ]}
                />

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

      {!!labelError && <Text style={styles.labelError}>{labelError}</Text>}

      <FlatList
        data={chats}
        keyExtractor={item => String(item.id)}
        renderItem={renderChat}
        // Room at the end so the button never covers the last chat.
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.rowDivider} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>
              {filtersOn
                ? 'No chats match these filters.'
                : 'No chats yet.'}
            </Text>

            {filtersOn && (
              <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                <Text style={styles.clearBtnText}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footer} color={WA.accent} />
          ) : null
        }
      />

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Theme</Text>

            <TouchableOpacity
              style={[styles.sheetItem, styles.sheetRow]}
              onPress={() => {
                setMenuOpen(false);
                setEditingLabel(null);
                setLabelError('');
                setManageOpen(true);
              }}
            >
              <WaIcon name="star" size={20} color={WA.icon} />
              <Text style={styles.sheetText}>Manage labels</Text>
            </TouchableOpacity>

            <View style={styles.sheetDivider} />

            <Text style={styles.sheetTitle}>Theme</Text>

            {THEME_MODES.map(([key, icon, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.sheetItem, styles.sheetRow]}
                onPress={() => {
                  setWaThemeMode(key);
                  setMenuOpen(false);
                }}
              >
                <WaIcon
                  name={icon}
                  size={20}
                  color={key === mode ? WA.green : WA.icon}
                />
                <Text
                  style={[styles.sheetText, key === mode && styles.sheetTextOn]}
                >
                  {label}
                </Text>
                {key === mode && <Text style={styles.sheetTick}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={jobDatesOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setJobDatesOpen(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setJobDatesOpen(false)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Delivery date</Text>

            <View style={styles.jobDates}>
              <DateTimeField
                label="From"
                value={jobFrom}
                onChange={setJobFrom}
                placeholder="Any"
                compact
                dateOnly
              />
              <DateTimeField
                label="To"
                value={jobTo}
                onChange={setJobTo}
                placeholder="Any"
                compact
                dateOnly
              />
            </View>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => {
                setJobFrom('');
                setJobTo('');
                setJobDatesOpen(false);
              }}
            >
              <Text style={styles.sheetText}>Clear dates</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => setJobDatesOpen(false)}
            >
              <Text style={[styles.sheetText, styles.sheetTextOn]}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
        visible={manageOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setManageOpen(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setManageOpen(false)}
        >
          {/* Stops a tap inside the sheet from closing it, which a backdrop
              wrapping its own content otherwise does. */}
          <TouchableOpacity style={styles.sheet} activeOpacity={1}>
            <Text style={styles.sheetTitle}>Labels</Text>

            {!!labelError && <Text style={styles.labelError}>{labelError}</Text>}

            {editingLabel ? (
              <View style={styles.labelEditor}>
                <TextInput
                  style={styles.labelInput}
                  placeholder="Label name"
                  placeholderTextColor={WA.textMuted}
                  value={labelName}
                  onChangeText={setLabelName}
                  autoFocus
                />

                <View style={styles.swatchRow}>
                  {LABEL_COLORS.map(colour => (
                    <TouchableOpacity
                      key={colour}
                      style={[
                        styles.swatch,
                        { backgroundColor: colour },
                        labelColor === colour && styles.swatchOn,
                      ]}
                      onPress={() => setLabelColor(colour)}
                      accessibilityLabel={`Colour ${colour}`}
                    />
                  ))}
                </View>

                <View style={styles.labelActions}>
                  <TouchableOpacity
                    style={styles.labelGhost}
                    onPress={() => setEditingLabel(null)}
                  >
                    <Text style={styles.labelGhostText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.labelSave, savingLabel && styles.labelSaveOff]}
                    onPress={saveLabel}
                    disabled={savingLabel}
                  >
                    <Text style={styles.labelSaveText}>
                      {editingLabel.id ? 'Save' : 'Create'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <ScrollView style={styles.labelList}>
                  {labels.length === 0 ? (
                    <Text style={styles.labelHint}>No labels yet.</Text>
                  ) : (
                    labels.map(l => (
                      <View key={l.id} style={styles.labelManageRow}>
                        <TouchableOpacity
                          style={styles.labelManageMain}
                          onPress={() => startLabel(l)}
                        >
                          <View
                            style={[styles.labelDot, { backgroundColor: l.color }]}
                          />
                          <Text style={styles.sheetText} numberOfLines={1}>
                            {l.name}
                          </Text>
                          <Text style={styles.labelManageCount}>
                            {l.customers_count ?? 0}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.labelDelete}
                          onPress={() => removeLabel(l)}
                          accessibilityLabel={`Delete ${l.name}`}
                          hitSlop={HIT}
                        >
                          <WaIcon name="trash" size={18} color={C.danger} />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={styles.labelSave}
                  onPress={() => startLabel(null)}
                >
                  <Text style={styles.labelSaveText}>New label</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
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

            <TouchableOpacity
              style={styles.labelRowItem}
              onPress={() => {
                setLabelSheet(null);
                setEditingLabel(null);
                setLabelError('');
                setManageOpen(true);
              }}
            >
              <Text style={[styles.sheetText, styles.sheetTextOn]}>
                Manage labels…
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* New chat lives here now, as WhatsApp's green button, rather than as an
          icon competing for space on the header. */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setNewChatOpen(true)}
        accessibilityLabel="New chat"
        activeOpacity={0.85}
      >
        <WaIcon name="newChat" size={26} color={dark ? '#0B141A' : '#FFFFFF'} />
      </TouchableOpacity>

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
              placeholderTextColor={WA.textMuted}
              keyboardType="phone-pad"
              value={newPhone}
              onChangeText={setNewPhone}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Name (optional)"
              placeholderTextColor={WA.textMuted}
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

// Small icon buttons need a bigger touch target than their artwork.
const HIT = { top: 10, bottom: 10, left: 10, right: 10 };

const makeStyles = T => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.panel },
  searchWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: T.panel,
  },
  // One rounded field holding the icon and the input, rather than a bare box.
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: T.panelAlt,
    borderRadius: 22,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 14.5,
    color: T.text,
  },
  // Bare icon on the header, no pill: a proper white icon does not need one.
  headerBtn: { marginRight: 14 },
  viewTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: T.panel,
  },
  viewTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: T.panelAlt,
  },
  viewTabSpacing: { marginRight: 8 },
  viewTabActive: { backgroundColor: T.chipOn },
  viewTabText: { fontSize: 13.5, color: T.textMuted, fontWeight: '500' },
  viewTabTextActive: { color: T.chipOnText, fontWeight: '600' },
  jobBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.divider,
    backgroundColor: T.panel,
  },
  jobBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 8,
  },
  jobPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: T.divider,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  jobPillOn: { backgroundColor: T.green, borderColor: T.green },
  jobPillText: { fontSize: 12.5, color: T.text },
  jobPillTextOn: { color: '#fff', fontWeight: '600' },
  jobCount: {
    minWidth: 20,
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    backgroundColor: T.panelAlt,
  },
  jobCountOn: { backgroundColor: 'rgba(255,255,255,0.25)' },
  jobCountText: { fontSize: 11, fontWeight: '700', color: T.textMuted },
  jobClear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  jobClearText: { fontSize: 12.5, color: T.icon },
  jobDates: { paddingHorizontal: 20 },
  labelBar: {
    flexGrow: 0,
    backgroundColor: T.panel,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.divider,
  },
  listContent: { paddingBottom: 96 },
  // A rounded square, not a circle — that is the shape WhatsApp uses now.
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 26,
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.badge,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 14,
    paddingVertical: 9,
    backgroundColor: T.panel,
  },
  // WhatsApp's divider starts past the avatar, not at the screen edge.
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: T.divider,
    marginLeft: 82,
  },
  avatar: { marginRight: 14 },
  rowBody: { flex: 1, minWidth: 0 },
  rowLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: { flex: 1, fontWeight: '500', fontSize: 16, color: T.text },
  time: { fontSize: 12, color: T.textMuted, marginLeft: 8 },
  // An unread chat marks its time in green, the way WhatsApp does.
  timeUnread: { color: T.green, fontWeight: '600' },
  preview: { flex: 1, fontSize: 14, color: T.textMuted, marginTop: 3 },
  previewUnread: { color: T.text },
  rowIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 8,
    marginTop: 3,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: T.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11.5, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', paddingTop: 40, gap: 12 },
  clearBtn: {
    borderWidth: 1,
    borderColor: T.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  clearBtnText: { color: T.accent, fontWeight: '700', fontSize: 13 },
  labelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  labelChip: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  labelText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  empty: { textAlign: 'center', color: T.textMuted, marginTop: 40 },
  // Names the filter in force, now that its tabs live behind the + menu.
  sheetBackdrop: {
    flex: 1,
    backgroundColor: T.backdrop,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: T.panel,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 8,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: T.textMuted,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  // The theme rows carry an icon and a tick; the other sheet rows are text
  // only, so the row layout is kept off the shared style.
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sheetTextOn: { color: T.green, fontWeight: '600' },
  sheetTick: {
    marginLeft: 'auto',
    color: T.green,
    fontSize: 15,
    fontWeight: '700',
  },
  sheetItem: { paddingHorizontal: 20, paddingVertical: 14 },
  sheetText: { fontSize: 15, color: T.text },
  sheetDanger: { fontSize: 15, color: C.danger },
  labelBarContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  labelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.divider,
    borderRadius: 16,
    paddingLeft: 10,
    paddingRight: 6,
    height: 30,
    marginRight: 6,
    backgroundColor: T.panel,
  },
  labelPillText: {
    fontSize: 12.5,
    color: T.textMuted,
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
    backgroundColor: T.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelCountOn: { backgroundColor: 'rgba(255,255,255,0.3)' },
  labelCountText: { fontSize: 11, fontWeight: '700', color: T.textMuted },
  labelRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  labelCheck: { flex: 1, textAlign: 'right', color: T.badge, fontWeight: '700' },
  labelError: {
    fontSize: 12,
    color: C.danger,
    paddingHorizontal: 14,
    paddingBottom: 6,
    backgroundColor: T.panelAlt,
  },
  labelList: { maxHeight: 320 },
  labelManageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  labelManageMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  labelManageCount: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '700',
    color: T.textMuted,
  },
  labelDelete: { padding: 8 },
  labelEditor: { paddingHorizontal: 20, paddingTop: 4 },
  labelInput: {
    borderWidth: 1,
    borderColor: T.divider,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: T.text,
    backgroundColor: T.panelAlt,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  // A ring rather than a tick: the colour has to stay readable underneath.
  swatchOn: { borderWidth: 3, borderColor: T.text },
  labelActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  labelGhost: { paddingHorizontal: 16, paddingVertical: 10 },
  labelGhostText: { fontSize: 14, color: T.textMuted, fontWeight: '600' },
  labelSave: {
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 18,
    marginHorizontal: 20,
    marginTop: 6,
    backgroundColor: T.green,
  },
  labelSaveOff: { opacity: 0.6 },
  labelSaveText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  labelHint: {
    fontSize: 12,
    color: T.textMuted,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: T.divider,
    marginVertical: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: T.backdrop,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { backgroundColor: T.panel, borderRadius: 12, padding: 18 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: T.text, marginBottom: 12 },
  modalInput: {
    backgroundColor: T.panelAlt,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14.5,
    color: T.text,
    marginBottom: 10,
  },
  modalHint: { fontSize: 12, color: T.textMuted, marginBottom: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancel: { paddingHorizontal: 14, paddingVertical: 10 },
  modalCancelText: { color: T.textMuted, fontWeight: '600' },
  modalPrimary: {
    backgroundColor: T.badge,
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

// Built once each, not per render.
const LIGHT_STYLES = makeStyles(WA_LIGHT);
const DARK_STYLES = makeStyles(WA_DARK);

export default WhatsAppChatsScreen;
