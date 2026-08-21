// screens/WhatsAppThreadScreen.js
//
// One conversation: bubbles, delivery ticks, media, and a composer. Polls with
// ?since_id so only new messages come down the wire while the thread is open.

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import { whatsappAPI } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { C } from '../utils/theme';

const WhatsAppThreadScreen = ({ route, navigation }) => {
  const { customerId, name, phone } = route.params;
  const { hasPermission } = useAuth();
  const canSend = hasPermission('send_whatsapp_message');

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');

  const canTemplate = hasPermission('send_whatsapp_template');
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [chosenTemplate, setChosenTemplate] = useState(null);
  const [variables, setVariables] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchHits, setSearchHits] = useState([]);
  const [searching, setSearching] = useState(false);

  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaTab, setMediaTab] = useState('media');
  const [mediaData, setMediaData] = useState(null);

  const [locationOpen, setLocationOpen] = useState(false);
  const [locMode, setLocMode] = useState('share');
  const [locLat, setLocLat] = useState('');
  const [locLng, setLocLng] = useState('');
  const [locName, setLocName] = useState('');
  const [locBody, setLocBody] = useState('Could you share your location?');

  const listRef = useRef(null);
  const lastIdRef = useRef(0);
  const countRef = useRef(0);
  // Scrolling away to read history should not be interrupted by an arriving
  // message, so auto-scroll only applies while the newest message is in view.
  const atBottomRef = useRef(true);

  useEffect(() => {
    navigation.setOptions({
      title: name || phone || 'Chat',
      headerRight: () => (
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setSearchOpen(true)}
          >
            <Text style={styles.headerIcon}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={openMedia}>
            <Text style={styles.headerIcon}>🖼</Text>
          </TouchableOpacity>
        </View>
      ),
    });
    // openMedia is stable for this customer; re-running on every render would
    // reset the header each poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, name, phone]);

  const rememberLastId = list => {
    list.forEach(m => {
      if (m.id > lastIdRef.current) lastIdRef.current = m.id;
    });
  };

  const loadInitial = useCallback(async () => {
    const res = await whatsappAPI.getMessages(customerId);
    const list = res.data.messages || [];
    rememberLastId(list);
    setMessages(list);
  }, [customerId]);

  const poll = useCallback(async () => {
    // An empty thread has no last id to poll from — fetch the whole (still tiny)
    // conversation instead, otherwise a brand-new chat would never update.
    if (!lastIdRef.current) {
      const first = await whatsappAPI.getMessages(customerId);
      const list = first.data.messages || [];
      if (!list.length) return;

      rememberLastId(list);
      setMessages(list);
      return;
    }

    const res = await whatsappAPI.getMessages(customerId, lastIdRef.current);
    const fresh = res.data.messages || [];
    const updates = res.data.updates || [];

    if (!fresh.length && !updates.length) return;

    rememberLastId(fresh);

    setMessages(prev => {
      // Apply ticks, reactions and deletions to bubbles already on screen.
      const patched = updates.length
        ? prev.map(m => {
            const update = updates.find(u => u.id === m.id);
            if (!update) return m;
            if (
              m.status === update.status &&
              m.reaction === update.reaction &&
              m.deleted === update.deleted
            ) {
              return m; // unchanged, keep the same object so the row doesn't re-render
            }
            return { ...m, ...update };
          })
        : prev;

      if (!fresh.length) return patched;

      // Merge by id rather than appending blindly: an optimistic bubble added on
      // send would otherwise appear twice when the poll returns the same message.
      const byId = new Map(patched.map(m => [m.id, m]));
      fresh.forEach(m => byId.set(m.id, m));

      return Array.from(byId.values()).sort((a, b) => a.id - b.id);
    });
  }, [customerId]);

  useEffect(() => {
    setLoading(true);
    loadInitial()
      .catch(() => Alert.alert('Error', 'Could not load this conversation.'))
      .finally(() => setLoading(false));
  }, [loadInitial]);

  useEffect(() => {
    const timer = setInterval(() => {
      poll().catch(() => {});
    }, 2000);

    return () => clearInterval(timer);
  }, [poll]);

  const appendLocal = message => {
    if (!message?.id) return;
    rememberLastId([message]);

    setMessages(prev => {
      const byId = new Map(prev.map(m => [m.id, m]));
      byId.set(message.id, message);
      return Array.from(byId.values()).sort((a, b) => a.id - b.id);
    });
  };

  // The list is inverted, so "newest first" renders at the visual bottom and the
  // latest message is on screen without any scrolling — scrollToEnd on a list that
  // is still laying out is unreliable, which is why it never landed before.
  const inverted = useMemo(() => [...messages].reverse(), [messages]);

  useEffect(() => {
    const grew = messages.length > countRef.current;
    countRef.current = messages.length;

    // Offset 0 is the newest message on an inverted list. Only pull the view down
    // if the agent was already there, so reading history isn't interrupted.
    if (grew && atBottomRef.current) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;

    setSending(true);
    setText('');

    try {
      const res = await whatsappAPI.sendText(customerId, body);
      appendLocal(res.data.message);
    } catch (error) {
      // Failed sends still return the logged message, so show it with its
      // failed state rather than silently dropping what the agent typed.
      const failed = error?.response?.data?.message;
      if (failed?.id) appendLocal(failed);

      Alert.alert(
        'Not delivered',
        'WhatsApp rejected this message. If the customer has not messaged in the last 24 hours, you must send an approved template first.',
      );
    } finally {
      setSending(false);
    }
  };

  const attach = async () => {
    if (!canSend) return;

    try {
      const image = await ImagePicker.openPicker({
        mediaType: 'photo',
        compressImageQuality: 0.8,
      });

      const formData = new FormData();
      formData.append('customer_id', String(customerId));
      formData.append('type', 'image');
      formData.append('caption', text.trim());
      formData.append('file', {
        uri: image.path,
        type: image.mime || 'image/jpeg',
        name: image.filename || `photo_${Date.now()}.jpg`,
      });

      setText('');
      setSending(true);

      const res = await whatsappAPI.sendMedia(formData);
      appendLocal(res.data.message);
    } catch (error) {
      if (error?.code === 'E_PICKER_CANCELLED') return;
      Alert.alert('Error', 'Could not send that photo.');
    } finally {
      setSending(false);
    }
  };

  const runSearch = async term => {
    setSearchTerm(term);

    if (term.trim().length < 2) {
      setSearchHits([]);
      return;
    }

    setSearching(true);

    try {
      const res = await whatsappAPI.searchMessages(customerId, term.trim());
      setSearchHits(res.data.messages || []);
    } catch (error) {
      setSearchHits([]);
    } finally {
      setSearching(false);
    }
  };

  const openMedia = async () => {
    setMediaOpen(true);
    setMediaTab('media');
    setMediaData(null);

    try {
      const res = await whatsappAPI.getChatMedia(customerId);
      setMediaData(res.data);
    } catch (error) {
      Alert.alert('Error', 'Could not load media for this chat.');
      setMediaOpen(false);
    }
  };

  const sendLocation = async () => {
    if (sending) return;

    const payload = { customer_id: customerId, mode: locMode };

    if (locMode === 'share') {
      const lat = parseFloat(locLat);
      const lng = parseFloat(locLng);

      if (isNaN(lat) || isNaN(lng)) {
        Alert.alert('Missing coordinates', 'Enter both a latitude and a longitude.');
        return;
      }

      payload.latitude = lat;
      payload.longitude = lng;
      payload.name = locName.trim();
    } else {
      payload.body = locBody.trim();
    }

    setSending(true);

    try {
      const res = await whatsappAPI.sendLocation(payload);
      appendLocal(res.data.message);
      setLocationOpen(false);
    } catch (error) {
      const failed = error?.response?.data?.message;
      if (failed?.id) appendLocal(failed);
      Alert.alert('Not sent', 'WhatsApp rejected this location message.');
    } finally {
      setSending(false);
    }
  };

  const openTemplates = async () => {
    setTemplateOpen(true);
    setChosenTemplate(null);
    setLoadingTemplates(true);

    try {
      const res = await whatsappAPI.getTemplates();
      setTemplates(res.data.templates || []);
    } catch (error) {
      Alert.alert('Error', 'Could not load templates.');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const chooseTemplate = template => {
    setChosenTemplate(template);
    // One input per {{n}} placeholder in the template body.
    setVariables(Array(template.variable_count || 0).fill(''));
  };

  const sendTemplate = async () => {
    if (!chosenTemplate || sending) return;

    setSending(true);

    try {
      const res = await whatsappAPI.sendTemplate(
        customerId,
        chosenTemplate.id,
        variables,
      );
      appendLocal(res.data.message);
      setTemplateOpen(false);
      setChosenTemplate(null);
    } catch (error) {
      const failed = error?.response?.data?.message;
      if (failed?.id) appendLocal(failed);
      Alert.alert('Not sent', 'WhatsApp rejected this template.');
    } finally {
      setSending(false);
    }
  };

  // Splits a body into plain runs and tappable links. React Native has no
  // equivalent of an <a> tag, so the text has to be broken up manually.
  const renderBody = body => {
    const parts = String(body).split(/(https?:\/\/[^\s]+)/gi);

    return parts.map((part, i) =>
      /^https?:\/\//i.test(part) ? (
        <Text
          key={i}
          style={styles.inlineLink}
          onPress={() => Linking.openURL(part).catch(() => {})}
        >
          {part}
        </Text>
      ) : (
        part
      ),
    );
  };

  const tick = status => {
    if (status === 'read') return '✓✓';
    if (status === 'delivered') return '✓✓';
    if (status === 'sent') return '✓';
    if (status === 'failed') return '⚠';
    return '🕐';
  };

  const renderBubble = ({ item }) => {
    const out = item.direction === 'out';
    const time = new Date(item.created_at.replace(' ', 'T')).toLocaleTimeString(
      [],
      { hour: '2-digit', minute: '2-digit' },
    );

    return (
      <View style={[styles.bubbleRow, out ? styles.rowOut : styles.rowIn]}>
        <View style={[styles.bubble, out ? styles.bubbleOut : styles.bubbleIn]}>
          {item.deleted ? (
            <Text style={styles.deleted}>This message was deleted</Text>
          ) : (
            <>
              {item.referral && (
                <TouchableOpacity
                  style={styles.adCard}
                  onPress={() =>
                    item.referral.source_url &&
                    Linking.openURL(item.referral.source_url).catch(() => {})
                  }
                >
                  {!!item.referral.thumbnail_url && (
                    <Image
                      source={{ uri: item.referral.thumbnail_url }}
                      style={styles.adThumb}
                    />
                  )}
                  <View style={styles.adMeta}>
                    <Text style={styles.adTag}>FROM AN AD</Text>
                    {!!item.referral.headline && (
                      <Text style={styles.adHeadline} numberOfLines={1}>
                        {item.referral.headline}
                      </Text>
                    )}
                    {!!item.referral.body && (
                      <Text style={styles.adBody} numberOfLines={2}>
                        {item.referral.body}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}

              {item.type === 'image' && item.media_url && (
                <Image source={{ uri: item.media_url }} style={styles.media} />
              )}

              {item.type === 'location' && item.location && (
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${item.location.latitude},${item.location.longitude}`,
                    )
                  }
                >
                  <Text style={styles.link}>
                    📍 {item.location.name || 'Shared location'}
                  </Text>
                </TouchableOpacity>
              )}

              {['document', 'audio', 'video'].includes(item.type) &&
                item.media_url && (
                  <TouchableOpacity onPress={() => Linking.openURL(item.media_url)}>
                    <Text style={styles.link}>📎 {item.body}</Text>
                  </TouchableOpacity>
                )}

              {!!item.body &&
                !['location'].includes(item.type) &&
                item.type !== 'document' && (
                  <Text style={styles.body}>{renderBody(item.body)}</Text>
                )}
            </>
          )}

          <View style={styles.metaRow}>
            {!!item.reaction && (
              <Text style={styles.reaction}>{item.reaction}</Text>
            )}
            <Text style={styles.time}>{time}</Text>
            {out && (
              <Text
                style={[
                  styles.tick,
                  item.status === 'read' && styles.tickRead,
                  item.status === 'failed' && styles.tickFailed,
                ]}
              >
                {tick(item.status)}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading conversation..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={inverted}
        inverted
        keyExtractor={item => String(item.id)}
        renderItem={renderBubble}
        contentContainerStyle={styles.listContent}
        onScroll={e => {
          // Inverted: y grows as you scroll back through older messages.
          atBottomRef.current = e.nativeEvent.contentOffset.y < 120;
        }}
        scrollEventThrottle={16}
      />

      {canSend ? (
        <View style={styles.composer}>
          {canTemplate && (
            <TouchableOpacity style={styles.attachBtn} onPress={openTemplates}>
              <Text style={styles.attachIcon}>📋</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.attachBtn}
            onPress={() => setLocationOpen(true)}
          >
            <Text style={styles.attachIcon}>📍</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.attachBtn} onPress={attach}>
            <Text style={styles.attachIcon}>📎</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Type a message"
            placeholderTextColor={C.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
          />

          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            onPress={send}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendIcon}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.noPermission}>
          You don't have permission to send WhatsApp messages.
        </Text>
      )}

      <Modal
        visible={searchOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSearchOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Search in this chat</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Type at least 2 characters"
              placeholderTextColor={C.textSecondary}
              value={searchTerm}
              onChangeText={runSearch}
              autoFocus
            />

            {searching ? (
              <ActivityIndicator color={C.accent} style={styles.modalLoader} />
            ) : (
              <ScrollView style={styles.modalScroll}>
                {searchTerm.trim().length >= 2 && searchHits.length === 0 ? (
                  <Text style={styles.modalHint}>No matches.</Text>
                ) : (
                  searchHits.map(hit => (
                    <View key={hit.id} style={styles.templateRow}>
                      <Text style={styles.templateName}>
                        {hit.direction === 'out' ? 'You' : name}
                      </Text>
                      <Text style={styles.templateMeta}>{hit.body}</Text>
                      <Text style={styles.searchWhen}>{hit.created_at}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setSearchOpen(false);
                  setSearchTerm('');
                  setSearchHits([]);
                }}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={mediaOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMediaOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Media, links and docs</Text>

            <View style={styles.tabRow}>
              {['media', 'links', 'docs'].map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, mediaTab === tab && styles.tabActive]}
                  onPress={() => setMediaTab(tab)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      mediaTab === tab && styles.tabTextActive,
                    ]}
                  >
                    {tab === 'media' ? 'Media' : tab === 'links' ? 'Links' : 'Docs'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {!mediaData ? (
              <ActivityIndicator color={C.accent} style={styles.modalLoader} />
            ) : (
              <ScrollView style={styles.modalScroll}>
                {(mediaData[mediaTab] || []).length === 0 ? (
                  <Text style={styles.modalHint}>
                    Nothing shared in this chat yet.
                  </Text>
                ) : mediaTab === 'media' ? (
                  <View style={styles.mediaGrid}>
                    {mediaData.media.map(m => (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => Linking.openURL(m.url)}
                      >
                        <Image source={{ uri: m.url }} style={styles.thumb} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  (mediaData[mediaTab] || []).map((item, i) => (
                    <TouchableOpacity
                      key={`${item.id}-${i}`}
                      style={styles.templateRow}
                      onPress={() => Linking.openURL(item.url)}
                    >
                      <Text style={styles.templateName} numberOfLines={1}>
                        {mediaTab === 'links' ? item.url : item.name}
                      </Text>
                      <Text style={styles.templateMeta}>{item.when}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setMediaOpen(false)}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={locationOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLocationOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Location</Text>

            <View style={styles.tabRow}>
              {[
                ['share', 'Share a pin'],
                ['request', 'Ask the customer'],
              ].map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.tab, locMode === key && styles.tabActive]}
                  onPress={() => setLocMode(key)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      locMode === key && styles.tabTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {locMode === 'share' ? (
              <>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Latitude"
                  placeholderTextColor={C.textSecondary}
                  value={locLat}
                  onChangeText={setLocLat}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Longitude"
                  placeholderTextColor={C.textSecondary}
                  value={locLng}
                  onChangeText={setLocLng}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Place name (optional)"
                  placeholderTextColor={C.textSecondary}
                  value={locName}
                  onChangeText={setLocName}
                />
                <Text style={styles.modalHint}>
                  Tip: long-press a spot in Google Maps to copy its coordinates.
                </Text>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.modalInput}
                  value={locBody}
                  onChangeText={setLocBody}
                />
                <Text style={styles.modalHint}>
                  WhatsApp shows the customer a button that attaches their current
                  position.
                </Text>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setLocationOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalPrimary, sending && styles.disabled]}
                onPress={sendLocation}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalPrimaryText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={templateOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTemplateOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {chosenTemplate ? chosenTemplate.name : 'Send a Template'}
            </Text>

            {loadingTemplates ? (
              <ActivityIndicator color={C.accent} style={styles.modalLoader} />
            ) : chosenTemplate ? (
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.templateBody}>{chosenTemplate.body_text}</Text>

                {variables.map((value, i) => (
                  <TextInput
                    key={i}
                    style={styles.modalInput}
                    placeholder={`Value for {{${i + 1}}}`}
                    placeholderTextColor={C.textSecondary}
                    value={value}
                    onChangeText={next =>
                      setVariables(prev =>
                        prev.map((v, at) => (at === i ? next : v)),
                      )
                    }
                  />
                ))}

                {!variables.length && (
                  <Text style={styles.modalHint}>
                    This template takes no variables.
                  </Text>
                )}
              </ScrollView>
            ) : (
              <ScrollView style={styles.modalScroll}>
                {templates.length === 0 ? (
                  <Text style={styles.modalHint}>
                    No templates yet. Sync them from the web CRM first.
                  </Text>
                ) : (
                  templates.map(t => (
                    <TouchableOpacity
                      key={t.id}
                      style={styles.templateRow}
                      onPress={() => chooseTemplate(t)}
                    >
                      <Text style={styles.templateName}>{t.name}</Text>
                      <Text style={styles.templateMeta} numberOfLines={2}>
                        {t.language} · {t.body_text}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() =>
                  chosenTemplate ? setChosenTemplate(null) : setTemplateOpen(false)
                }
              >
                <Text style={styles.modalCancelText}>
                  {chosenTemplate ? 'Back' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              {chosenTemplate && (
                <TouchableOpacity
                  style={[styles.modalPrimary, sending && styles.disabled]}
                  onPress={sendTemplate}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalPrimaryText}>Send</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECE5DD' },
  listContent: { padding: 12 },
  bubbleRow: { flexDirection: 'row', marginBottom: 8 },
  rowOut: { justifyContent: 'flex-end' },
  rowIn: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  bubbleOut: { backgroundColor: '#DCF8C6' },
  bubbleIn: { backgroundColor: '#FFFFFF' },
  body: { fontSize: 14.5, color: '#111B21' },
  deleted: { fontSize: 14, color: C.textSecondary, fontStyle: 'italic' },
  link: { fontSize: 14.5, color: C.accent, textDecorationLine: 'underline' },
  inlineLink: { color: '#027eb5', textDecorationLine: 'underline' },
  adCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderLeftWidth: 3,
    borderLeftColor: '#25D366',
    borderRadius: 6,
    padding: 6,
    marginBottom: 6,
  },
  adThumb: { width: 48, height: 48, borderRadius: 4 },
  adMeta: { flex: 1, minWidth: 0 },
  adTag: { fontSize: 10, fontWeight: '700', color: '#25D366' },
  adHeadline: { fontSize: 12.5, fontWeight: '600', color: '#111B21' },
  adBody: { fontSize: 11.5, color: '#54656F' },
  media: { width: 200, height: 200, borderRadius: 8, marginBottom: 4 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  reaction: { fontSize: 13 },
  time: { fontSize: 10.5, color: '#667781' },
  tick: { fontSize: 11, color: '#667781' },
  tickRead: { color: '#53BDEB' },
  tickFailed: { color: C.danger },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 8,
  },
  attachBtn: { paddingHorizontal: 6, paddingVertical: 8 },
  attachIcon: { fontSize: 20 },
  input: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: C.bgAlt,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14.5,
    color: C.text,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendIcon: { color: '#fff', fontSize: 17 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 18,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 12 },
  modalScroll: { maxHeight: 340 },
  modalLoader: { marginVertical: 24 },
  modalInput: {
    backgroundColor: C.bgAlt,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14.5,
    color: C.text,
    marginBottom: 10,
  },
  modalHint: { fontSize: 12.5, color: C.textSecondary, marginVertical: 8 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  modalCancel: { paddingHorizontal: 14, paddingVertical: 10 },
  modalCancelText: { color: C.textSecondary, fontWeight: '600' },
  modalPrimary: {
    backgroundColor: '#25D366',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 90,
    alignItems: 'center',
  },
  modalPrimaryText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  templateRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  templateName: { fontWeight: '600', fontSize: 14.5, color: C.text },
  templateMeta: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  templateBody: {
    fontSize: 13.5,
    color: C.textSecondary,
    marginBottom: 12,
    lineHeight: 19,
  },
  headerRow: { flexDirection: 'row' },
  headerBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  headerIcon: { fontSize: 17 },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
    marginBottom: 10,
  },
  tab: { paddingHorizontal: 14, paddingVertical: 8 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#25D366' },
  tabText: { color: C.textSecondary, fontSize: 13.5 },
  tabTextActive: { color: '#25D366', fontWeight: '700' },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  thumb: { width: 92, height: 92, borderRadius: 6, backgroundColor: C.bgAlt },
  searchWhen: { fontSize: 11, color: C.textSecondary, marginTop: 2 },
  noPermission: {
    textAlign: 'center',
    color: C.textSecondary,
    padding: 16,
    backgroundColor: C.surface,
  },
});

export default WhatsAppThreadScreen;
