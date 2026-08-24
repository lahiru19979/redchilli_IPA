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
// v4 exports a ready-made instance, not a class: `new AudioRecorderPlayer()`
// throws at module scope and takes the whole bundle down with it.
import audioRecorder from 'react-native-audio-recorder-player';
import Geolocation from '@react-native-community/geolocation';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { whatsappAPI, MEDIA_BASE_URL } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { C } from '../utils/theme';

// react-native-permissions already asks; letting the library ask as well
// races the two dialogs and the second one silently fails on Android.
Geolocation.setRNConfiguration({
  skipPermissionRequests: true,
  authorizationLevel: 'whenInUse',
  locationProvider: 'auto',
});

// getCurrentPosition is callback-only, which makes a fallback read awkward.
const readPosition = options =>
  new Promise((resolve, reject) => {
    try {
      Geolocation.getCurrentPosition(resolve, reject, options);
    } catch (error) {
      reject(error);
    }
  });

// A short badge for a file card: the real extension where there is one, a mic
// for voice notes, else a generic label.
const fileExt = item => {
  const name = item.filename || item.body || '';
  const ext = name.includes('.') ? name.split('.').pop() : '';

  if (ext && ext.length <= 4) return ext.toUpperCase();

  return item.type === 'audio' ? '\u266A' : item.type === 'video' ? 'VID' : 'FILE';
};

// Voice notes are named after their timestamp on disk, which is no use to a
// person, so they get a plain label instead.
const fileLabel = item => {
  if (item.type === 'audio') return 'Voice message';

  return (
    item.filename
    || (item.body && !/^\[.*\]$/.test(item.body) ? item.body : '')
    || (item.type === 'video' ? 'Video' : 'Document')
  );
};

// "[image]", "[document]" and friends are placeholders WhatsApp sends in place
// of a caption. Printing them under the attachment is just noise.
const isPlaceholderBody = body => !body || /^\[.*\]$/.test(body.trim());

const WhatsAppThreadScreen = ({ route, navigation }) => {
  const { customerId, name, phone } = route.params;
  const { hasPermission } = useAuth();
  const canSend = hasPermission('send_whatsapp_message');

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');

  const canTemplate = hasPermission('send_whatsapp_template');
  const canCatalog = hasPermission('send_whatsapp_catalog');
  const canProducts = hasPermission('send_whatsapp_products');
  const canViewJobs = hasPermission('view_job_cards');
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

  // The bubble whose action sheet is open, plus the reply/forward state.
  const [actionMsg, setActionMsg] = useState(null);

  // Pinned messages ride in a bar above the thread; starred ones are collected
  // in the media panel's Starred tab.
  const [pins, setPins] = useState([]);
  const [pinIndex, setPinIndex] = useState(0);
  const [starred, setStarred] = useState([]);
  const [flashId, setFlashId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [forwardChats, setForwardChats] = useState([]);
  const [forwardPicked, setForwardPicked] = useState([]);
  const [forwardSearch, setForwardSearch] = useState('');

  const [uploadNote, setUploadNote] = useState('');

  // Catalog and product picker.
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogMode, setCatalogMode] = useState('catalog'); // catalog | products
  const [catalogBody, setCatalogBody] = useState('Browse our catalog');
  const [catalogFooter, setCatalogFooter] = useState('');
  const [productHeader, setProductHeader] = useState('Our picks for you');
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [chosenProducts, setChosenProducts] = useState([]);

  // Saved replies: the same library the web CRM manages.
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedMode, setSavedMode] = useState('list'); // list | preview | edit
  const [replies, setReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [activeReply, setActiveReply] = useState(null);
  const [savingReply, setSavingReply] = useState(false);
  const [replyTitle, setReplyTitle] = useState('');
  const [replyShortcut, setReplyShortcut] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [replyPhotos, setReplyPhotos] = useState([]);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const recordPathRef = useRef(null);

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

          {canViewJobs && (
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() =>
                navigation.navigate('WhatsAppJobs', { customerId, name, phone })
              }
            >
              <Text style={styles.headerIcon}>🗂</Text>
            </TouchableOpacity>
          )}
        </View>
      ),
    });
    // openMedia is stable for this customer; re-running on every render would
    // reset the header each poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, name, phone, canViewJobs]);

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
              m.deleted === update.deleted &&
              m.pinned === update.pinned &&
              m.starred === update.starred
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

  // Leaving mid-recording would otherwise leave the mic open.
  useEffect(() => {
    return () => {
      audioRecorder.stopRecorder().catch(() => {});
      audioRecorder.removeRecordBackListener();
    };
  }, []);

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
      const res = await whatsappAPI.sendText(customerId, body, replyTo?.id || null);
      appendLocal(res.data.message);
      setReplyTo(null);
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
    if (!canSend || sending) return;

    let picked;

    try {
      picked = await ImagePicker.openPicker({
        mediaType: 'photo',
        multiple: true,
        maxFiles: 10,
        compressImageQuality: 0.8,
      });
    } catch (error) {
      if (error?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Could not open your photos.');
      }
      return;
    }

    // multiple:true returns an array, but a single-select fallback (some
    // Android pickers) still hands back one object.
    const files = (Array.isArray(picked) ? picked : [picked]).filter(Boolean);
    if (!files.length) return;

    // WhatsApp puts the caption on the first photo only.
    const caption = text.trim();
    setText('');
    setSending(true);

    let failed = 0;

    // Sequential on purpose: it keeps the bubbles in the order the agent
    // picked them, and one upload at a time is kinder to a phone connection.
    for (let i = 0; i < files.length; i += 1) {
      const image = files[i];

      setUploadNote(
        files.length > 1 ? `Sending photo ${i + 1} of ${files.length}…` : 'Sending photo…',
      );

      const formData = new FormData();
      formData.append('customer_id', String(customerId));
      formData.append('type', 'image');
      formData.append('caption', i === 0 ? caption : '');
      formData.append('file', {
        uri: image.path.startsWith('file://') ? image.path : `file://${image.path}`,
        type: image.mime || 'image/jpeg',
        name: image.filename || `photo_${Date.now()}_${i}.jpg`,
      });

      try {
        const res = await whatsappAPI.sendMedia(formData);
        appendLocal(res.data.message);
      } catch (error) {
        failed += 1;
      }
    }

    setUploadNote('');
    setSending(false);

    if (failed) {
      Alert.alert(
        'Some photos did not send',
        failed === files.length
          ? 'None of those photos went through. Check your connection and try again.'
          : `${failed} of ${files.length} could not be sent — try those again.`,
      );
    }
  };

  // Handing the URL to the system browser puts the file through Android's
  // download manager (and iOS's share sheet), which saves it and shows the usual
  // notification. Saving straight into the gallery would need a filesystem
  // module and another native build, which this does not.
  const downloadFile = url => {
    if (!url) return;

    // Media saved before the public disk had a url configured is stored as a
    // bare path ("/storage/..."). Android has no idea what to do with a link
    // that has no scheme, which is what produced "no app can open that link".
    const absolute = /^https?:\/\//i.test(url)
      ? url
      : `${MEDIA_BASE_URL}/${String(url).replace(/^\//, '')}`;

    Linking.openURL(absolute).catch(() =>
      Alert.alert(
        'Could not download',
        `No app on this phone can open:

${absolute}`,
      ),
    );
  };

  // Update one bubble in place, the way react() does for reactions.
  const patchLocal = (id, changes) => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, ...changes } : m)));
  };

  // The list is inverted, so the index is into the reversed array.
  const jumpToMessage = id => {
    const index = inverted.findIndex(m => String(m.id) === String(id));
    if (index < 0 || !listRef.current) return;

    listRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });

    setFlashId(id);
    setTimeout(() => setFlashId(null), 1400);
  };

  const loadPins = useCallback(async () => {
    try {
      const res = await whatsappAPI.getPinned(customerId);
      setPins(res.data.pins || []);
      setStarred(res.data.starred || []);
      setPinIndex(0);
    } catch (error) {
      setPins([]);
      setStarred([]);
    }
  }, [customerId]);

  useEffect(() => {
    loadPins();
  }, [loadPins]);

  const togglePin = async message => {
    const next = !message.pinned;
    setActionMsg(null);

    // Optimistic, so the bubble marker flips the moment the sheet closes.
    patchLocal(message.id, { pinned: next });

    try {
      const res = await whatsappAPI.pinMessage(message.id, next);
      setPins(res.data.pins || []);
      setPinIndex(0);
    } catch (error) {
      patchLocal(message.id, { pinned: !next });
      Alert.alert('Not saved', 'Could not update that pin.');
    }
  };

  const toggleStar = async message => {
    const next = !message.starred;
    setActionMsg(null);

    patchLocal(message.id, { starred: next });

    try {
      await whatsappAPI.starMessage(message.id, next);
      loadPins();
    } catch (error) {
      patchLocal(message.id, { starred: !next });
      Alert.alert('Not saved', 'Could not update that star.');
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

  const [locatingMe, setLocatingMe] = useState(false);

  const useMyLocation = async () => {
    const permission = Platform.OS === 'android'
      ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
      : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;

    const status = await check(permission);
    const granted = status === RESULTS.GRANTED
      || (await request(permission)) === RESULTS.GRANTED;

    if (!granted) {
      Alert.alert(
        'Location blocked',
        'Allow location access in your phone settings, or type the coordinates in by hand.',
      );
      return;
    }

    setLocatingMe(true);

    try {
      let pos;

      try {
        pos = await readPosition({
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 10000,
        });
      } catch (gpsError) {
        // Indoors a GPS fix often never arrives, and the old single
        // high-accuracy read just timed out. The network provider answers
        // almost immediately and is accurate enough to drop a pin.
        pos = await readPosition({
          enableHighAccuracy: false,
          timeout: 30000,
          maximumAge: 600000,
        });
      }

      setLocLat(pos.coords.latitude.toFixed(6));
      setLocLng(pos.coords.longitude.toFixed(6));
    } catch (error) {
      Alert.alert(
        'Could not read your location',
        error?.message
          ? `${error.message}

Switch location on in your phone settings, or type the coordinates in by hand.`
          : 'Switch location on in your phone settings, then try again.',
      );
    } finally {
      setLocatingMe(false);
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

  const loadProducts = useCallback(async term => {
    setLoadingProducts(true);

    try {
      const res = await whatsappAPI.searchProducts(term || '');
      setProducts(res.data.products || []);
    } catch (error) {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const openCatalog = mode => {
    setCatalogMode(mode);
    setCatalogOpen(true);

    if (mode === 'products' && products.length === 0) {
      loadProducts('');
    }
  };

  const toggleProduct = id => {
    setChosenProducts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id],
    );
  };

  const sendCatalog = async () => {
    if (sending) return;

    if (!catalogBody.trim()) {
      Alert.alert('Add a message', 'WhatsApp needs a line of text with the catalog.');
      return;
    }

    setSending(true);

    try {
      const res = await whatsappAPI.sendCatalog(
        customerId,
        catalogBody.trim(),
        catalogFooter.trim(),
      );
      appendLocal(res.data.message);
      setCatalogOpen(false);
    } catch (error) {
      const failed = error?.response?.data?.message;
      if (failed?.id) appendLocal(failed);

      Alert.alert(
        'Not sent',
        typeof failed === 'string'
          ? failed
          : 'WhatsApp rejected the catalog message. Check that a commerce catalog is connected to this number.',
      );
    } finally {
      setSending(false);
    }
  };

  const sendProducts = async () => {
    if (sending) return;

    if (!chosenProducts.length) {
      Alert.alert('Pick some products', 'Tap the ones you want to send.');
      return;
    }

    if (!productHeader.trim() || !catalogBody.trim()) {
      Alert.alert('Add a heading and a message', 'Both are required for a product list.');
      return;
    }

    setSending(true);

    try {
      const res = await whatsappAPI.sendProducts(
        customerId,
        chosenProducts,
        productHeader.trim(),
        catalogBody.trim(),
        catalogFooter.trim(),
      );
      appendLocal(res.data.message);
      setCatalogOpen(false);
      setChosenProducts([]);
    } catch (error) {
      const failed = error?.response?.data?.message;
      if (failed?.id) appendLocal(failed);

      Alert.alert(
        'Not sent',
        typeof failed === 'string'
          ? failed
          : 'WhatsApp rejected the product list. The products must exist in the connected commerce catalog under the same product codes.',
      );
    } finally {
      setSending(false);
    }
  };

  const loadReplies = useCallback(async () => {
    setLoadingReplies(true);

    try {
      const res = await whatsappAPI.getSavedReplies();
      setReplies(res.data.replies || []);
    } catch (error) {
      setReplies([]);
    } finally {
      setLoadingReplies(false);
    }
  }, []);

  // Loaded up front, not only when the sheet opens, so the shortcut strip above
  // the composer can match while the agent types.
  useEffect(() => {
    if (canSend) loadReplies();
  }, [canSend, loadReplies]);

  const openSavedReplies = () => {
    setSavedMode('list');
    setActiveReply(null);
    setSavedOpen(true);
    loadReplies();
  };

  const previewReply = reply => {
    setActiveReply(reply);
    setSavedMode('preview');
    setSavedOpen(true);
  };

  const startNewReply = () => {
    setActiveReply(null);
    setReplyTitle('');
    setReplyShortcut('');
    setReplyBody('');
    setReplyPhotos([]);
    setSavedMode('edit');
  };

  const startEditReply = reply => {
    setActiveReply(reply);
    setReplyTitle(reply.title || '');
    setReplyShortcut(reply.shortcut || '');
    setReplyBody(reply.body || '');
    // Only newly picked photos live here; the ones already saved stay
    // server-side and are appended to, never replaced.
    setReplyPhotos([]);
    setSavedMode('edit');
  };

  const pickReplyPhotos = async () => {
    try {
      const picked = await ImagePicker.openPicker({
        mediaType: 'photo',
        multiple: true,
        maxFiles: 10,
        compressImageQuality: 0.8,
      });

      const files = (Array.isArray(picked) ? picked : [picked]).filter(Boolean);
      setReplyPhotos(prev => [...prev, ...files].slice(0, 10));
    } catch (error) {
      if (error?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Could not open your photos.');
      }
    }
  };

  const saveReply = async () => {
    if (savingReply) return;

    if (!replyTitle.trim()) {
      Alert.alert('Name it first', 'Give this reply a short name so you can find it later.');
      return;
    }

    if (!replyBody.trim() && !replyPhotos.length && !activeReply?.images?.length) {
      Alert.alert('Nothing to save', 'Add some text or at least one photo.');
      return;
    }

    setSavingReply(true);

    const formData = new FormData();
    if (activeReply?.id) formData.append('id', String(activeReply.id));
    formData.append('title', replyTitle.trim());
    formData.append('shortcut', replyShortcut.trim().replace(/^\//, ''));
    formData.append('body', replyBody);

    replyPhotos.forEach((photo, i) => {
      formData.append('images[]', {
        uri: photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`,
        type: photo.mime || 'image/jpeg',
        name: photo.filename || `reply_${Date.now()}_${i}.jpg`,
      });
    });

    try {
      const res = await whatsappAPI.saveSavedReply(formData);
      const saved = res.data.reply;

      setReplies(prev => [saved, ...prev.filter(r => r.id !== saved.id)]);

      setReplyPhotos([]);
      setSavedMode('list');
      setActiveReply(null);
    } catch (error) {
      Alert.alert(
        'Not saved',
        error?.response?.data?.message || 'Could not save that reply.',
      );
    } finally {
      setSavingReply(false);
    }
  };

  const removeReply = reply => {
    Alert.alert('Delete this reply?', `"${reply.title}" will be gone for everyone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await whatsappAPI.deleteSavedReply(reply.id);
            setReplies(prev => prev.filter(r => r.id !== reply.id));
            setSavedMode('list');
            setActiveReply(null);
          } catch (error) {
            Alert.alert('Error', 'Could not delete that reply.');
          }
        },
      },
    ]);
  };

  const sendSavedReply = async () => {
    if (!activeReply || sending) return;

    setSending(true);
    setUploadNote('Sending saved reply...');

    try {
      const res = await whatsappAPI.sendSavedReply(customerId, activeReply.id);
      (res.data.messages || []).forEach(appendLocal);

      setSavedOpen(false);
      setActiveReply(null);
      // The shortcut that triggered this is still sitting in the box otherwise.
      if (text.trim().startsWith('/')) setText('');
    } catch (error) {
      Alert.alert(
        'Not sent',
        error?.response?.data?.message
          || 'WhatsApp rejected this reply. If the customer has not messaged in the last 24 hours, send an approved template first.',
      );
    } finally {
      setSending(false);
      setUploadNote('');
    }
  };

  // A leading slash in the composer filters the library, the way the web CRM's
  // popup does. Titles match too, since on a phone the name is easier to recall
  // than the trigger.
  const shortcutMatches = useMemo(() => {
    const typed = text.trim();
    if (!canSend || !typed.startsWith('/') || typed.includes('\n')) return [];

    const term = typed.slice(1).toLowerCase();

    return replies
      .filter(r =>
        !term
        || (r.shortcut || '').startsWith(term)
        || (r.title || '').toLowerCase().includes(term))
      .slice(0, 4);
  }, [text, replies, canSend]);

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

  const REACTIONS = ['\u{1F44D}', '\u2764\uFE0F', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F64F}'];

  const react = async (message, emoji) => {
    setActionMsg(null);

    // Sending the same emoji again clears it, matching WhatsApp.
    const next = message.reaction === emoji ? '' : emoji;
    const previous = message.reaction || null;

    // Paint it immediately. The request has to reach our server and then Meta,
    // which is a second or more on mobile data — far too long for a tap that
    // should feel instant.
    setMessages(prev =>
      prev.map(m => (m.id === message.id ? { ...m, reaction: next || null } : m)),
    );

    try {
      const res = await whatsappAPI.react(message.id, next);
      appendLocal(res.data.message); // reconcile with what the server stored
    } catch (error) {
      // Put the old reaction back if it was rejected.
      setMessages(prev =>
        prev.map(m => (m.id === message.id ? { ...m, reaction: previous } : m)),
      );

      Alert.alert(
        'Could not react',
        error?.response?.data?.message || 'Please try again.',
      );
    }
  };

  const removeMessage = (message, scope) => {
    setActionMsg(null);

    Alert.alert(
      scope === 'me' ? 'Delete for me' : 'Delete for everyone',
      'WhatsApp cannot recall a delivered message, so it stays on the customer\'s phone either way. This only affects the CRM.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await whatsappAPI.deleteMessage(message.id, scope);

              if (res.data.message) {
                appendLocal(res.data.message); // tombstone
              } else {
                setMessages(prev => prev.filter(m => m.id !== message.id));
              }
            } catch (error) {
              Alert.alert('Could not delete', 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const openForward = async message => {
    setActionMsg(null);
    setForwardMsg(message);
    setForwardPicked([]);
    setForwardSearch('');

    try {
      const res = await whatsappAPI.getChats(1, '');
      setForwardChats(res.data.data || []);
    } catch (error) {
      setForwardChats([]);
    }
  };

  const doForward = async () => {
    if (!forwardMsg || !forwardPicked.length || sending) return;

    setSending(true);

    try {
      const res = await whatsappAPI.forward(forwardMsg.id, forwardPicked);
      setForwardMsg(null);

      const { sent, failed } = res.data;
      Alert.alert(
        'Forwarded',
        failed
          ? `Sent to ${sent} chat(s), ${failed} failed.`
          : `Sent to ${sent} chat(s).`,
      );
    } catch (error) {
      Alert.alert(
        'Could not forward',
        error?.response?.data?.message || 'Please try again.',
      );
    } finally {
      setSending(false);
    }
  };

  const micPermission = async () => {
    const permission = Platform.OS === 'android'
      ? PERMISSIONS.ANDROID.RECORD_AUDIO
      : PERMISSIONS.IOS.MICROPHONE;

    const status = await check(permission);
    if (status === RESULTS.GRANTED) return true;

    return (await request(permission)) === RESULTS.GRANTED;
  };

  const startRecording = async () => {
    if (recording || sending) return;

    if (!(await micPermission())) {
      Alert.alert(
        'Microphone blocked',
        'Allow microphone access in your phone settings to record voice messages.',
      );
      return;
    }

    try {
      // Let the library choose the platform default container: m4a/AAC on
      // Android and iOS, both of which WhatsApp accepts.
      const path = await audioRecorder.startRecorder();
      recordPathRef.current = path;

      audioRecorder.addRecordBackListener(e => {
        setRecordSecs(Math.floor(e.currentPosition / 1000));
      });

      setRecordSecs(0);
      setRecording(true);
    } catch (error) {
      Alert.alert('Could not start recording', 'Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      const path = await audioRecorder.stopRecorder();
      audioRecorder.removeRecordBackListener();
      setRecording(false);
      return path || recordPathRef.current;
    } catch (error) {
      setRecording(false);
      return null;
    }
  };

  const cancelRecording = async () => {
    await stopRecording();
    recordPathRef.current = null;
    setRecordSecs(0);
  };

  const sendRecording = async () => {
    const path = await stopRecording();

    if (!path) {
      Alert.alert('Nothing recorded', 'Try holding the mic a moment longer.');
      return;
    }

    // Too short to be intentional — almost always a mis-tap.
    if (recordSecs < 1) {
      recordPathRef.current = null;
      setRecordSecs(0);
      return;
    }

    // The recorder returns a bare filesystem path on Android and a file:// URL on
    // iOS. FormData needs the scheme on both, and stripping it (as this did) left
    // Android uploading nothing — which is what WhatsApp rejected as 131053.
    const uri = path.startsWith('file://') ? path : `file://${path}`;

    // Name and mime must match the container the recorder actually produced,
    // otherwise Meta refuses the upload.
    const ext = (path.split('.').pop() || 'mp4').toLowerCase();
    const mime = ext === 'm4a' || ext === 'mp4' || ext === 'aac'
      ? 'audio/mp4'
      : ext === 'ogg'
        ? 'audio/ogg'
        : 'audio/mpeg';

    const formData = new FormData();
    formData.append('customer_id', String(customerId));
    formData.append('type', 'audio');
    formData.append('caption', '');
    formData.append('file', {
      uri,
      type: mime,
      name: `voice_${Date.now()}.${ext}`,
    });

    setSending(true);

    try {
      const res = await whatsappAPI.sendMedia(formData);
      appendLocal(res.data.message);
    } catch (error) {
      Alert.alert(
        'Not sent',
        error?.response?.data?.message || 'Could not send that voice message.',
      );
    } finally {
      setSending(false);
      recordPathRef.current = null;
      setRecordSecs(0);
    }
  };

  const formatSecs = total => {
    const m = Math.floor(total / 60);
    const sec = total % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
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
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={() => !item.deleted && setActionMsg(item)}
          delayLongPress={280}
          style={[
            styles.bubble,
            out ? styles.bubbleOut : styles.bubbleIn,
            String(flashId) === String(item.id) && styles.bubbleFlash,
          ]}
        >
          {!!item.reply_to && (
            <View style={styles.quote}>
              <Text style={styles.quoteWho}>
                {item.reply_to.direction === 'out' ? 'You' : name}
              </Text>
              <Text style={styles.quoteBody} numberOfLines={2}>
                {item.reply_to.body}
              </Text>
            </View>
          )}
          {item.deleted ? (
            <Text style={styles.deleted}>This message was deleted</Text>
          ) : (
            <>
              {item.referral && (
                <TouchableOpacity
                  style={styles.adCard}
                  activeOpacity={item.referral.source_url ? 0.7 : 1}
                  onPress={() =>
                    item.referral.source_url &&
                    Linking.openURL(item.referral.source_url).catch(() => {})
                  }
                >
                  {!!item.referral.thumbnail_url && (
                    <Image
                      source={{ uri: item.referral.thumbnail_url }}
                      style={styles.adThumb}
                      resizeMode="cover"
                    />
                  )}

                  <View style={styles.adMeta}>
                    <Text style={styles.adTag}>
                      {item.referral.source_type === 'post'
                        ? 'FROM A POST'
                        : 'FROM AN AD'}
                    </Text>

                    {!!item.referral.headline && (
                      <Text style={styles.adHeadline} numberOfLines={2}>
                        {item.referral.headline}
                      </Text>
                    )}

                    {!!item.referral.body && (
                      <Text style={styles.adBody} numberOfLines={3}>
                        {item.referral.body}
                      </Text>
                    )}

                    {!!item.referral.source_url && (
                      <Text style={styles.adLink}>Tap to open</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}

              {item.type === 'image' && item.media_url && (
                <View style={styles.mediaWrap}>
                  <Image source={{ uri: item.media_url }} style={styles.media} />

                  <TouchableOpacity
                    style={styles.mediaDl}
                    onPress={() => downloadFile(item.media_url)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.mediaDlIcon}>⤓</Text>
                  </TouchableOpacity>
                </View>
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
                  <View style={styles.fileCard}>
                    <View style={styles.fileBadge}>
                      <Text style={styles.fileBadgeText}>{fileExt(item)}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.fileOpen}
                      onPress={() => Linking.openURL(item.media_url)}
                    >
                      <Text style={styles.fileName} numberOfLines={2}>
                        {fileLabel(item)}
                      </Text>
                      <Text style={styles.fileSub}>Tap to open</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.fileDl}
                      onPress={() => downloadFile(item.media_url)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.fileDlIcon}>⤓</Text>
                    </TouchableOpacity>
                  </View>
                )}

              {!isPlaceholderBody(item.body) &&
                item.type !== 'location' &&
                item.type !== 'document' &&
                item.type !== 'audio' && (
                  <Text style={styles.body}>{renderBody(item.body)}</Text>
                )}
            </>
          )}

          <View style={styles.metaRow}>
            {!!item.pinned && <Text style={styles.metaFlag}>📌</Text>}
            {!!item.starred && <Text style={styles.metaFlag}>⭐</Text>}
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
        </TouchableOpacity>
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
        style={styles.list}
        inverted
        keyExtractor={item => String(item.id)}
        renderItem={renderBubble}
        contentContainerStyle={styles.listContent}
        onScrollToIndexFailed={info => {
          listRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: true,
          });
        }}
        onScroll={e => {
          // Inverted: y grows as you scroll back through older messages.
          atBottomRef.current = e.nativeEvent.contentOffset.y < 120;
        }}
        scrollEventThrottle={16}
      />

      {!!replyTo && (
        <View style={styles.replyBar}>
          <View style={styles.replyBarMeta}>
            <Text style={styles.quoteWho}>
              Replying to {replyTo.direction === 'out' ? 'yourself' : name}
            </Text>
            <Text style={styles.quoteBody} numberOfLines={1}>
              {replyTo.body}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyBarX}>
            <Text style={styles.replyBarXText}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {pins.length > 0 && (
        <TouchableOpacity
          style={styles.pinBar}
          onPress={() => {
            jumpToMessage(pins[pinIndex].id);
            // Cycle, so tapping again walks to the next pinned message.
            setPinIndex((pinIndex + 1) % pins.length);
          }}
        >
          <Text style={styles.pinIcon}>📌</Text>

          <Text style={styles.pinText} numberOfLines={1}>
            {pins[pinIndex]?.preview || '(no text)'}
          </Text>

          {pins.length > 1 && (
            <Text style={styles.pinCount}>
              {pinIndex + 1}/{pins.length}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {shortcutMatches.length > 0 && !recording && (
        <View style={styles.shortcutPop}>
          {shortcutMatches.map(r => (
            <TouchableOpacity
              key={r.id}
              style={styles.shortcutRow}
              onPress={() => previewReply(r)}
            >
              {r.images?.length ? (
                <Image source={{ uri: r.images[0] }} style={styles.shortcutThumb} />
              ) : (
                <View style={[styles.shortcutThumb, styles.shortcutThumbEmpty]} />
              )}

              <View style={styles.shortcutMeta}>
                <View style={styles.shortcutTitleRow}>
                  <Text style={styles.shortcutTitle} numberOfLines={1}>
                    {r.title}
                  </Text>
                  {!!r.shortcut && (
                    <Text style={styles.shortcutTag}>/{r.shortcut}</Text>
                  )}
                </View>
                <Text style={styles.shortcutBody} numberOfLines={1}>
                  {r.body || `${r.images?.length || 0} photo(s)`}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!!uploadNote && (
        <View style={styles.uploadNote}>
          <ActivityIndicator color={C.accent} size="small" />
          <Text style={styles.uploadNoteText}>{uploadNote}</Text>
        </View>
      )}

      {canSend && recording ? (
        <View style={styles.composer}>
          <TouchableOpacity style={styles.attachBtn} onPress={cancelRecording}>
            <Text style={styles.recCancel}>✕</Text>
          </TouchableOpacity>

          <View style={styles.recBar}>
            <View style={styles.recDot} />
            <Text style={styles.recTime}>{formatSecs(recordSecs)}</Text>
            <Text style={styles.recHint}>Recording…</Text>
          </View>

          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            onPress={sendRecording}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendIcon}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : canSend ? (
        <View style={styles.composerWrap}>
          <View style={styles.optionsRow}>
            <TouchableOpacity style={styles.optionBtn} onPress={openSavedReplies}>
              <Text style={styles.attachIcon}>💬</Text>
            </TouchableOpacity>

            {(canCatalog || canProducts) && (
              <TouchableOpacity
                style={styles.optionBtn}
                onPress={() => openCatalog(canCatalog ? 'catalog' : 'products')}
              >
                <Text style={styles.attachIcon}>🛍</Text>
              </TouchableOpacity>
            )}

            {canTemplate && (
              <TouchableOpacity style={styles.optionBtn} onPress={openTemplates}>
                <Text style={styles.attachIcon}>📋</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.optionBtn}
              onPress={() => setLocationOpen(true)}
            >
              <Text style={styles.attachIcon}>📍</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionBtn} onPress={attach}>
              <Text style={styles.attachIcon}>📎</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.composerRow}>
            <TextInput
              style={styles.input}
              placeholder="Type a message"
              placeholderTextColor={C.textSecondary}
              value={text}
              onChangeText={setText}
              multiline
            />

            {!text.trim() && (
              <TouchableOpacity style={styles.attachBtn} onPress={startRecording}>
                <Text style={styles.attachIcon}>🎤</Text>
              </TouchableOpacity>
            )}

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
        </View>
      ) : (
        <Text style={styles.noPermission}>
          You don't have permission to send WhatsApp messages.
        </Text>
      )}

      <Modal
        visible={!!actionMsg}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMsg(null)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setActionMsg(null)}
        >
          <View style={styles.sheet}>
            <View style={styles.reactionRow}>
              {REACTIONS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.reactionBtn,
                    actionMsg?.reaction === emoji && styles.reactionBtnOn,
                  ]}
                  onPress={() => react(actionMsg, emoji)}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => {
                setReplyTo(actionMsg);
                setActionMsg(null);
              }}
            >
              <Text style={styles.sheetText}>Reply</Text>
            </TouchableOpacity>

            {actionMsg?.forwardable && (
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={() => openForward(actionMsg)}
              >
                <Text style={styles.sheetText}>Forward</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => togglePin(actionMsg)}
            >
              <Text style={styles.sheetText}>
                {actionMsg?.pinned ? 'Unpin message' : 'Pin message'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => toggleStar(actionMsg)}
            >
              <Text style={styles.sheetText}>
                {actionMsg?.starred ? 'Remove star' : 'Star message'}
              </Text>
            </TouchableOpacity>

            <View style={styles.sheetDivider} />

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => removeMessage(actionMsg, 'me')}
            >
              <Text style={styles.sheetDanger}>Delete for me</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetItem}
              onPress={() => removeMessage(actionMsg, 'everyone')}
            >
              <Text style={styles.sheetDanger}>Delete for everyone</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={!!forwardMsg}
        transparent
        animationType="fade"
        onRequestClose={() => setForwardMsg(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Forward to…</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Search chats"
              placeholderTextColor={C.textSecondary}
              value={forwardSearch}
              onChangeText={setForwardSearch}
            />

            <ScrollView style={styles.modalScroll}>
              {forwardChats
                .filter(c =>
                  !forwardSearch.trim() ||
                  (c.name || '').toLowerCase().includes(forwardSearch.toLowerCase()) ||
                  (c.phone || '').includes(forwardSearch),
                )
                .map(c => {
                  const on = forwardPicked.includes(c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.templateRow}
                      onPress={() =>
                        setForwardPicked(prev =>
                          on ? prev.filter(id => id !== c.id) : [...prev, c.id],
                        )
                      }
                    >
                      <Text style={styles.templateName}>
                        {on ? '✓ ' : ''}{c.name}
                      </Text>
                      <Text style={styles.templateMeta}>{c.phone}</Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setForwardMsg(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalPrimary,
                  (!forwardPicked.length || sending) && styles.disabled,
                ]}
                onPress={doForward}
                disabled={!forwardPicked.length || sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalPrimaryText}>
                    Forward{forwardPicked.length ? ` (${forwardPicked.length})` : ''}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              {['media', 'links', 'docs', 'starred'].map(tab => (
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

            {mediaTab === 'starred' ? (
              <ScrollView style={styles.modalScroll}>
                {starred.length === 0 ? (
                  <Text style={styles.modalHint}>
                    No starred messages in this chat yet.
                  </Text>
                ) : (
                  starred.map(m => (
                    <TouchableOpacity
                      key={m.id}
                      style={styles.templateRow}
                      onPress={() => {
                        setMediaOpen(false);
                        jumpToMessage(m.id);
                      }}
                    >
                      <Text style={styles.templateName} numberOfLines={2}>
                        ⭐ {m.preview}
                      </Text>
                      <Text style={styles.templateMeta}>
                        {m.direction === 'out' ? 'Sent' : 'Received'} · {m.when}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            ) : !mediaData ? (
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
                      <View key={m.id} style={styles.mediaWrap}>
                        <TouchableOpacity onPress={() => Linking.openURL(m.url)}>
                          <Image source={{ uri: m.url }} style={styles.thumb} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.mediaDl}
                          onPress={() => downloadFile(m.url)}
                        >
                          <Text style={styles.mediaDlIcon}>⤓</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  (mediaData[mediaTab] || []).map((item, i) => (
                    <View key={`${item.id}-${i}`} style={styles.fileRow}>
                      <TouchableOpacity
                        style={styles.fileOpen}
                        onPress={() => Linking.openURL(item.url)}
                      >
                        <Text style={styles.templateName} numberOfLines={1}>
                          {mediaTab === 'links' ? item.url : item.name}
                        </Text>
                        <Text style={styles.templateMeta}>{item.when}</Text>
                      </TouchableOpacity>

                      {/* Links are addresses, not files — nothing to save. */}
                      {mediaTab !== 'links' && (
                        <TouchableOpacity
                          style={styles.fileDl}
                          onPress={() => downloadFile(item.url)}
                        >
                          <Text style={styles.fileDlIcon}>⤓</Text>
                        </TouchableOpacity>
                      )}
                    </View>
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
                <TouchableOpacity
                  style={[styles.locateBtn, locatingMe && styles.disabled]}
                  onPress={useMyLocation}
                  disabled={locatingMe}
                >
                  {locatingMe ? (
                    <ActivityIndicator color={C.accent} size="small" />
                  ) : (
                    <Text style={styles.locateBtnText}>Use my current location</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.modalHint}>
                  Or long-press a spot in Google Maps to copy its coordinates.
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
      <Modal
        visible={savedOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSavedOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {savedMode === 'edit'
                ? activeReply
                  ? 'Edit saved reply'
                  : 'New saved reply'
                : savedMode === 'preview'
                  ? activeReply?.title
                  : 'Saved replies'}
            </Text>

            {savedMode === 'list' ? (
              loadingReplies ? (
                <ActivityIndicator color={C.accent} style={styles.modalLoader} />
              ) : (
                <ScrollView style={styles.modalScroll}>
                  {replies.length === 0 ? (
                    <Text style={styles.modalHint}>
                      No saved replies yet. Tap New to write one — text, photos, or both.
                    </Text>
                  ) : (
                    replies.map(r => (
                      <View key={r.id} style={styles.replyRow}>
                        <TouchableOpacity
                          style={styles.replyRowMain}
                          onPress={() => previewReply(r)}
                        >
                          {r.images?.length ? (
                            <Image
                              source={{ uri: r.images[0] }}
                              style={styles.replyThumb}
                            />
                          ) : (
                            <View style={[styles.replyThumb, styles.shortcutThumbEmpty]} />
                          )}

                          <View style={styles.shortcutMeta}>
                            <View style={styles.shortcutTitleRow}>
                              <Text style={styles.replyTitle} numberOfLines={1}>
                                {r.title}
                              </Text>
                              {!!r.shortcut && (
                                <Text style={styles.shortcutTag}>/{r.shortcut}</Text>
                              )}
                            </View>
                            <Text style={styles.shortcutBody} numberOfLines={2}>
                              {r.body || `${r.images?.length || 0} photo(s)`}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.replyRowBtn}
                          onPress={() => startEditReply(r)}
                        >
                          <Text style={styles.replyRowIcon}>✎</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.replyRowBtn}
                          onPress={() => removeReply(r)}
                        >
                          <Text style={[styles.replyRowIcon, styles.replyRowIconDanger]}>
                            ✕
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </ScrollView>
              )
            ) : savedMode === 'preview' ? (
              <ScrollView style={styles.modalScroll}>
                {!!activeReply?.shortcut && (
                  <Text style={styles.shortcutTag}>/{activeReply.shortcut}</Text>
                )}

                {!!activeReply?.body && (
                  <Text style={styles.templateBody}>{activeReply.body}</Text>
                )}

                {!!activeReply?.images?.length && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {activeReply.images.map(uri => (
                      <Image key={uri} source={{ uri }} style={styles.replyPreviewImg} />
                    ))}
                  </ScrollView>
                )}

                <Text style={styles.modalHint}>
                  {activeReply?.images?.length
                    ? 'The photos go out as image messages, with the text as the caption on the first one.'
                    : 'Sent as an ordinary message, so the 24-hour window still applies.'}
                </Text>
              </ScrollView>
            ) : (
              <ScrollView style={styles.modalScroll}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Name, e.g. Price list"
                  placeholderTextColor={C.textSecondary}
                  value={replyTitle}
                  onChangeText={setReplyTitle}
                />

                <TextInput
                  style={styles.modalInput}
                  placeholder="Shortcut, e.g. price (optional)"
                  placeholderTextColor={C.textSecondary}
                  autoCapitalize="none"
                  value={replyShortcut}
                  onChangeText={setReplyShortcut}
                />

                <TextInput
                  style={[styles.modalInput, styles.modalInputTall]}
                  placeholder="Message text"
                  placeholderTextColor={C.textSecondary}
                  multiline
                  value={replyBody}
                  onChangeText={setReplyBody}
                />

                {!!activeReply?.images?.length && (
                  <>
                    <Text style={styles.modalHint}>Already saved</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {activeReply.images.map(uri => (
                        <Image key={uri} source={{ uri }} style={styles.replyEditImg} />
                      ))}
                    </ScrollView>
                  </>
                )}

                {!!replyPhotos.length && (
                  <>
                    <Text style={styles.modalHint}>Adding now</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {replyPhotos.map((photo, i) => (
                        <View key={`${photo.path}-${i}`} style={styles.replyEditWrap}>
                          <Image
                            source={{ uri: photo.path }}
                            style={styles.replyEditImg}
                          />
                          <TouchableOpacity
                            style={styles.replyEditX}
                            onPress={() =>
                              setReplyPhotos(prev => prev.filter((_, at) => at !== i))
                            }
                          >
                            <Text style={styles.replyEditXText}>×</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  </>
                )}

                <TouchableOpacity style={styles.locateBtn} onPress={pickReplyPhotos}>
                  <Text style={styles.locateBtnText}>Add photos from this phone</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  if (savedMode === 'list') setSavedOpen(false);
                  else {
                    setSavedMode('list');
                    setActiveReply(null);
                  }
                }}
              >
                <Text style={styles.modalCancelText}>
                  {savedMode === 'list' ? 'Close' : 'Back'}
                </Text>
              </TouchableOpacity>

              {savedMode === 'list' && (
                <TouchableOpacity style={styles.modalPrimary} onPress={startNewReply}>
                  <Text style={styles.modalPrimaryText}>New</Text>
                </TouchableOpacity>
              )}

              {savedMode === 'preview' && (
                <TouchableOpacity
                  style={[styles.modalPrimary, sending && styles.disabled]}
                  onPress={sendSavedReply}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalPrimaryText}>Send</Text>
                  )}
                </TouchableOpacity>
              )}

              {savedMode === 'edit' && (
                <TouchableOpacity
                  style={[styles.modalPrimary, savingReply && styles.disabled]}
                  onPress={saveReply}
                  disabled={savingReply}
                >
                  {savingReply ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalPrimaryText}>Save</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={catalogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCatalogOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {catalogMode === 'catalog' ? 'Send catalog' : 'Send products'}
            </Text>

            {canCatalog && canProducts && (
              <View style={styles.segmentRow}>
                <TouchableOpacity
                  style={[
                    styles.segment,
                    catalogMode === 'catalog' && styles.segmentOn,
                  ]}
                  onPress={() => setCatalogMode('catalog')}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      catalogMode === 'catalog' && styles.segmentTextOn,
                    ]}
                  >
                    Whole catalog
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segment,
                    catalogMode === 'products' && styles.segmentOn,
                  ]}
                  onPress={() => {
                    setCatalogMode('products');
                    if (products.length === 0) loadProducts('');
                  }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      catalogMode === 'products' && styles.segmentTextOn,
                    ]}
                  >
                    Pick products
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView style={styles.modalScroll}>
              {catalogMode === 'products' && (
                <>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Heading, e.g. Our picks for you"
                    placeholderTextColor={C.textSecondary}
                    value={productHeader}
                    onChangeText={setProductHeader}
                  />

                  <TextInput
                    style={styles.modalInput}
                    placeholder="Search products by name or code"
                    placeholderTextColor={C.textSecondary}
                    value={productSearch}
                    onChangeText={term => {
                      setProductSearch(term);
                      loadProducts(term);
                    }}
                  />

                  {loadingProducts ? (
                    <ActivityIndicator color={C.accent} style={styles.modalLoader} />
                  ) : products.length === 0 ? (
                    <Text style={styles.modalHint}>No products match that.</Text>
                  ) : (
                    products.map(product => {
                      const picked = chosenProducts.includes(product.id);

                      return (
                        <TouchableOpacity
                          key={product.id}
                          style={[styles.prodRow, picked && styles.prodRowOn]}
                          onPress={() => toggleProduct(product.id)}
                        >
                          {product.image ? (
                            <Image
                              source={{ uri: product.image }}
                              style={styles.prodThumb}
                            />
                          ) : (
                            <View style={[styles.prodThumb, styles.shortcutThumbEmpty]} />
                          )}

                          <View style={styles.shortcutMeta}>
                            <Text style={styles.replyTitle} numberOfLines={1}>
                              {product.product_name}
                            </Text>
                            <Text style={styles.shortcutBody} numberOfLines={1}>
                              {product.product_code}
                              {product.selling_price
                                ? ` \u00b7 Rs. ${product.selling_price}`
                                : ''}
                            </Text>
                          </View>

                          <Text style={styles.prodTick}>{picked ? '✓' : ''}</Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </>
              )}

              <TextInput
                style={[styles.modalInput, styles.modalInputTall]}
                placeholder="Message text"
                placeholderTextColor={C.textSecondary}
                multiline
                value={catalogBody}
                onChangeText={setCatalogBody}
              />

              <TextInput
                style={styles.modalInput}
                placeholder="Footer (optional)"
                placeholderTextColor={C.textSecondary}
                value={catalogFooter}
                onChangeText={setCatalogFooter}
              />

              <Text style={styles.modalHint}>
                {catalogMode === 'catalog'
                  ? 'Sends the commerce catalog connected to this WhatsApp number, which the customer can browse in the chat.'
                  : 'Products must exist in the connected catalog under the same product codes, otherwise WhatsApp rejects the list.'}
              </Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setCatalogOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalPrimary, sending && styles.disabled]}
                onPress={catalogMode === 'catalog' ? sendCatalog : sendProducts}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalPrimaryText}>
                    {catalogMode === 'catalog'
                      ? 'Send'
                      : `Send${chosenProducts.length ? ` (${chosenProducts.length})` : ''}`}
                  </Text>
                )}
              </TouchableOpacity>
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
  bubbleFlash: { backgroundColor: '#FFF3C4' },
  body: { fontSize: 14.5, color: '#111B21' },
  deleted: { fontSize: 14, color: C.textSecondary, fontStyle: 'italic' },
  link: { fontSize: 14.5, color: C.accent, textDecorationLine: 'underline' },
  inlineLink: { color: '#027eb5', textDecorationLine: 'underline' },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: '#25D366',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginBottom: 4,
  },
  quoteWho: { fontSize: 11.5, fontWeight: '700', color: '#25D366' },
  quoteBody: { fontSize: 12, color: '#54656F' },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  replyBarMeta: { flex: 1, minWidth: 0 },
  replyBarX: { paddingHorizontal: 10 },
  replyBarXText: { fontSize: 20, color: C.textSecondary },
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
  sheetItem: { paddingHorizontal: 20, paddingVertical: 14 },
  sheetText: { fontSize: 15, color: C.text },
  sheetDanger: { fontSize: 15, color: C.danger },
  sheetDivider: { height: 1, backgroundColor: C.divider, marginVertical: 6 },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  reactionBtn: { padding: 8, borderRadius: 20 },
  reactionBtnOn: { backgroundColor: '#DCF8C6' },
  reactionEmoji: { fontSize: 24 },
  recBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.bgAlt,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E53E3E' },
  recTime: { fontSize: 14, fontWeight: '700', color: C.text },
  recHint: { fontSize: 12.5, color: C.textSecondary },
  recCancel: { fontSize: 20, color: C.danger },
  locateBtn: {
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  locateBtnText: { color: C.accent, fontWeight: '600', fontSize: 13.5 },
  adCard: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    // Without a floor the card collapses to the thumbnail's width: a bubble is
    // sized by its widest child, so the flex:1 text column has nothing to push
    // against and wraps one word per line.
    minWidth: 210,
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderLeftWidth: 3,
    borderLeftColor: '#25D366',
    borderRadius: 6,
    padding: 6,
    marginBottom: 6,
  },
  adThumb: { width: 52, height: 52, borderRadius: 4 },
  adMeta: { flex: 1, minWidth: 0 },
  adTag: { fontSize: 10, fontWeight: '700', color: '#25D366', letterSpacing: 0.3 },
  adHeadline: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#111B21',
    marginTop: 1,
  },
  adBody: { fontSize: 11.5, color: '#54656F', marginTop: 1 },
  adLink: { fontSize: 11, color: '#027EB5', fontWeight: '600', marginTop: 3 },
  media: { width: 200, height: 200, borderRadius: 8, marginBottom: 4 },
  mediaWrap: { position: 'relative' },
  pinBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFF8E1',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F0E2B0',
  },
  pinIcon: { fontSize: 13 },
  pinText: { flex: 1, minWidth: 0, fontSize: 12.5, color: '#54656F' },
  pinCount: { fontSize: 11, fontWeight: '700', color: '#B58900' },
  metaFlag: { fontSize: 10, marginRight: 3 },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    // A bubble is sized by its widest child, so a row of flex:1 children has
    // nothing to push against and collapses to the badge's width. This floor is
    // what keeps the filename readable.
    minWidth: 210,
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  fileBadge: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  fileName: { fontSize: 13.5, fontWeight: '600', color: '#111B21' },
  fileSub: { fontSize: 11, color: '#54656F', marginTop: 1 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 200 },
  fileOpen: { flex: 1, minWidth: 0 },
  fileDl: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileDlIcon: { fontSize: 15, fontWeight: '700', color: '#54656F', lineHeight: 18 },
  mediaDl: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaDlIcon: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 19 },
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
  list: { flex: 1 },
  composerWrap: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.divider,
    marginBottom: 6,
  },
  optionBtn: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 2 },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 8,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: C.bgAlt,
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 6 },
  segmentOn: { backgroundColor: C.surface },
  segmentText: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  segmentTextOn: { color: C.accent },
  prodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.divider,
  },
  prodRowOn: { backgroundColor: C.accentLight },
  prodThumb: { width: 44, height: 44, borderRadius: 6 },
  prodTick: { fontSize: 16, fontWeight: '700', color: C.accent, width: 18 },
  shortcutPop: {
    backgroundColor: C.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.divider,
  },
  shortcutThumb: { width: 34, height: 34, borderRadius: 6 },
  shortcutThumbEmpty: { backgroundColor: C.bgAlt },
  shortcutMeta: { flex: 1, minWidth: 0 },
  shortcutTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shortcutTitle: {
    flexShrink: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: C.textPrimary,
  },
  shortcutTag: {
    fontSize: 11,
    fontWeight: '700',
    color: C.accent,
    backgroundColor: C.accentLight,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignSelf: 'flex-start',
  },
  shortcutBody: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.divider,
  },
  replyRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  replyThumb: { width: 44, height: 44, borderRadius: 8 },
  replyTitle: {
    flexShrink: 1,
    fontSize: 14.5,
    fontWeight: '700',
    color: C.textPrimary,
  },
  replyRowBtn: { paddingHorizontal: 6, paddingVertical: 6 },
  replyRowIcon: { fontSize: 16, color: C.textSecondary },
  replyRowIconDanger: { color: C.danger },
  replyPreviewImg: {
    width: 140,
    height: 140,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  replyEditWrap: { position: 'relative' },
  replyEditImg: {
    width: 72,
    height: 72,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  replyEditX: {
    position: 'absolute',
    top: -4,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyEditXText: { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 15 },
  modalInputTall: { minHeight: 90, textAlignVertical: 'top' },
  uploadNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.bgAlt,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  uploadNoteText: { fontSize: 12.5, color: C.textSecondary, fontWeight: '600' },
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
