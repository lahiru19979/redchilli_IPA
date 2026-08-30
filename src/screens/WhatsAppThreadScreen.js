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
  Keyboard,
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
// v4 exports a ready-made instance, not a class: `new AudioRecorderPlayer()`
// throws at module scope and takes the whole bundle down with it.
import audioRecorder from 'react-native-audio-recorder-player';
import Geolocation from '@react-native-community/geolocation';
import RNBlobUtil from 'react-native-blob-util';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { whatsappAPI, MEDIA_BASE_URL } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import WaIcon, { WaTicks } from '../components/WaIcon';
import WaWallpaper from '../components/WaWallpaper';
import WaAvatar from '../components/WaAvatar';
import EmojiPicker from '../components/EmojiPicker';
import ZoomableImage from '../components/ZoomableImage';
import { C, WA_LIGHT, WA_DARK } from '../utils/theme';
import { useWaTheme } from '../utils/waTheme';

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

// What to call the file once it is on the phone. The signed download link has
// no filename in it, so the name comes from the message, and the extension from
// the stored media path.
const downloadName = (meta, url) => {
  const tail = decodeURIComponent(
    String(url || '').split('?')[0].split('/').pop() || '',
  );
  const dot = tail.lastIndexOf('.');
  const ext = dot > 0 ? tail.slice(dot) : '';

  if (meta?.filename) return meta.filename;
  if (meta?.name) return meta.name;
  // A voice note is stored under a timestamp, which is no use in a file list.
  if (meta?.type === 'audio') return `voice_${meta.id || Date.now()}${ext || '.m4a'}`;

  return tail || `file_${Date.now()}${ext}`;
};

// Android needs to be told what a file is before it will hand it to a player
// or a viewer; the extension is all we have to go on.
const MIME_BY_EXT = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  '3gp': 'video/3gpp',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  wav: 'audio/wav',
  pdf: 'application/pdf',
};

const mimeFor = path =>
  MIME_BY_EXT[String(path).split('.').pop().toLowerCase()] || '*/*';

// "[image]", "[document]" and friends are placeholders WhatsApp sends in place
// of a caption. Printing them under the attachment is just noise.
const isPlaceholderBody = body => !body || /^\[.*\]$/.test(body.trim());

// The + sheet's tiles, in the order WhatsApp lays them out. Kept as data rather
// than repeated JSX so the permission rules and the colours sit in one place.
// What a photo is re-encoded at on the way out. The long edge is capped rather
// than the quality dialled down: 2048px at 92% is a touch better than WhatsApp's
// own ~1600px at ~80%, and lands well under the Cloud API's 5MB image limit.
// The 0.8 this used to be was re-compressing every photo, including ones that
// needed no shrinking at all.
const PHOTO_QUALITY = {
  compressImageMaxWidth: 2048,
  compressImageMaxHeight: 2048,
  compressImageQuality: 0.92,
};

// Header icons are small; give them a touch target that is not.
const HIT = { top: 10, bottom: 10, left: 10, right: 10 };

// What the chat header's menu offers. Call, Jobs and Labels are deliberately
// not here — they stay on the header, one tap away, being what gets reached for
// mid-conversation.
const HEADER_ITEMS = [
  {
    id: 'search',
    label: 'Search',
    icon: 'search',
    color: '#0E8A9B',
    enabled: () => true,
    run: a => a.setSearchOpen(true),
  },
  {
    id: 'media',
    label: 'Media',
    icon: 'image',
    color: '#5D5FEF',
    enabled: () => true,
    run: a => a.openMedia(),
  },
];

const ATTACH_ITEMS = [
  {
    id: 'photos',
    label: 'Gallery',
    icon: 'image',
    color: '#5D5FEF',
    enabled: () => true,
    run: a => a.attach(),
  },
  {
    id: 'camera',
    label: 'Camera',
    icon: 'camera',
    color: '#E0457B',
    enabled: () => true,
    run: a => a.takePhoto(),
  },
  {
    id: 'location',
    label: 'Location',
    icon: 'location',
    color: '#00A884',
    enabled: () => true,
    run: a => a.openLocation(),
  },
  {
    id: 'product',
    label: 'Product',
    icon: 'catalog',
    color: '#E8901A',
    enabled: p => p.canProducts,
    run: a => a.openProducts(),
  },
  {
    id: 'template',
    label: 'FB Template',
    icon: 'template',
    color: '#D9414F',
    enabled: p => p.canTemplate,
    run: a => a.openTemplates(),
  },
  {
    id: 'saved',
    label: 'Quick Reply',
    icon: 'savedReply',
    color: '#0E8A9B',
    enabled: () => true,
    run: a => a.openSavedReplies(),
  },
];

const WhatsAppThreadScreen = ({ route, navigation }) => {
  // Follows the phone's appearance setting. Shadowing WA and styles
  // here means every reference below switches with it, untouched.
  const { dark, WA } = useWaTheme();
  const styles = dark ? DARK_STYLES : LIGHT_STYLES;

  // Android 15 forces apps to draw edge to edge, so the composer would otherwise
  // sit underneath the system navigation bar.
  const insets = useSafeAreaInsets();
  const { customerId, name, phone } = route.params;
  const { hasPermission } = useAuth();
  const canSend = hasPermission('send_whatsapp_message');

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);

  // Where the caret is, so a tapped emoji lands there instead of always at the
  // end. The ref is what the handlers read (state would be a keystroke stale);
  // the state is only set right after an insert, to push the caret past the
  // emoji, and released again so typing stays uncontrolled.
  const caret = useRef({ start: 0, end: 0 });
  const [selection, setSelection] = useState(undefined);

  useEffect(() => {
    if (!selection) return undefined;
    const id = setTimeout(() => setSelection(undefined), 40);
    return () => clearTimeout(id);
  }, [selection]);

  const replaceAtCaret = replacement => {
    const { start, end } = caret.current;
    const a = Math.min(start, text.length);
    const b = Math.min(Math.max(end, a), text.length);
    const next = text.slice(0, a) + replacement + text.slice(b);
    const at = a + replacement.length;

    setText(next);
    caret.current = { start: at, end: at };
    setSelection({ start: at, end: at });
  };

  // One tap deletes one emoji, not one code unit: an emoji is several code
  // points joined by zero-width joiners, and dropping a single one leaves the
  // wreckage of half a glyph behind.
  const backspace = () => {
    const { start, end } = caret.current;
    const a = Math.min(start, text.length);
    const b = Math.min(Math.max(end, a), text.length);

    if (a !== b) {
      replaceAtCaret('');
      return;
    }
    if (!a) return;

    const points = Array.from(text.slice(0, a));
    let dropped = points.pop();
    // A variation selector belongs to the glyph in front of it.
    if (dropped === '️') points.pop();
    // And a joiner means the glyph continues further back.
    while (points.length && points[points.length - 1] === '‍') {
      points.pop();
      dropped = points.pop();
      if (dropped === '️') points.pop();
    }

    const head = points.join('');
    setText(head + text.slice(a));
    caret.current = { start: head.length, end: head.length };
    setSelection({ start: head.length, end: head.length });
  };

  const toggleEmoji = () => {
    setEmojiOpen(open => {
      // The panel takes the keyboard's place rather than stacking on top of it.
      if (!open) Keyboard.dismiss();
      return !open;
    });
  };

  const canTemplate = hasPermission('send_whatsapp_template');
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
  const [locLink, setLocLink] = useState('');
  const [readingLink, setReadingLink] = useState(false);
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
  const [attachOpen, setAttachOpen] = useState(false);

  // The customer's labels, so a chat can be tagged without going back to the
  // list and hunting for the row.
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [labels, setLabels] = useState([]);
  const [appliedLabels, setAppliedLabels] = useState([]);
  const [labelBusy, setLabelBusy] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  const [uploadNote, setUploadNote] = useState('');
  // The photo being looked at full screen: the set it belongs to and which one
  // of them, so the arrows have somewhere to go.
  const [viewing, setViewing] = useState(null);

  const openViewer = (list, index) => {
    if (!list.length || index < 0) return;
    setViewing({ list, index });
  };

  const stepViewer = useCallback(by =>
    setViewing(current => {
      if (!current) return current;

      const next = current.index + by;
      return next < 0 || next >= current.list.length
        ? current
        : { ...current, index: next };
    }), []);

  const closeViewer = useCallback(() => setViewing(null), []);
  const showNextPhoto = useCallback(() => stepViewer(1), [stepViewer]);
  const showPrevPhoto = useCallback(() => stepViewer(-1), [stepViewer]);

  // Pull the neighbours into the image cache while the current one is on
  // screen. Without this every swipe waited on a fresh download, which is what
  // the delay after letting go actually was.
  useEffect(() => {
    if (!viewing) return;

    [viewing.index - 1, viewing.index + 1].forEach(i => {
      const near = viewing.list[i];
      if (near?.media_url) Image.prefetch(near.media_url).catch(() => {});
    });
  }, [viewing]);

  // Which voice note is playing, and how far through. One at a time: the
  // recorder library holds a single player.
  const [playingId, setPlayingId] = useState(null);
  const [playPos, setPlayPos] = useState(0);
  const [playDur, setPlayDur] = useState(0);

  // message id -> where the file landed on this phone, so a downloaded
  // attachment offers to play or open rather than to download again.
  const [savedFiles, setSavedFiles] = useState({});
  const checkedRef = useRef(new Set());

  // Whether the note is work in progress (spinner) or a finished result.
  const [noteBusy, setNoteBusy] = useState(true);

  const showNote = (note, busy = true) => {
    setNoteBusy(busy);
    setUploadNote(note);
  };

  // Product picker.
  const [productsOpen, setProductsOpen] = useState(false);
  const [productNote, setProductNote] = useState('');
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

  // A normal phone call, not a WhatsApp call: tel: hands the number to the
  // dialer with it already typed in, so the agent still chooses to dial.
  const callCustomer = () => {
    if (!phone) return;

    const dial = `tel:${String(phone).replace(/[^0-9+]/g, '')}`;

    Linking.openURL(dial).catch(() =>
      Alert.alert('Could not call', 'This device cannot place phone calls.'),
    );
  };

  const openJobs = () =>
    navigation.navigate('WhatsAppJobs', { customerId, name, phone });

  useEffect(() => {
    navigation.setOptions({
      title: name || phone || 'Chat',
      // The same round initial the chat list shows, so a customer looks the
      // same on the way in as they did in the list.
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <WaAvatar id={customerId} name={name || phone} size={34} />
          <Text style={styles.headerName} numberOfLines={1}>
            {name || phone || 'Chat'}
          </Text>
        </View>
      ),
      headerTitleAlign: 'left',
      // Call and Jobs sit on the header itself; everything else is behind the
      // three dots.
      // Match the chat list: the navigator's blue header would sit oddly
      // above a dark thread.
      headerStyle: { backgroundColor: WA.headerBg },
      headerTintColor: '#fff',
      headerRight: () => (
        <View style={styles.headerRow}>
          {!!phone && (
            <TouchableOpacity
              onPress={callCustomer}
              accessibilityLabel="Call customer"
              hitSlop={HIT}
            >
              <WaIcon name="phone" size={21} color="#fff" />
            </TouchableOpacity>
          )}

          {canViewJobs && (
            <TouchableOpacity
              onPress={openJobs}
              accessibilityLabel="Job cards"
              hitSlop={HIT}
            >
              <WaIcon name="doc" size={21} color="#fff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={openLabels}
            accessibilityLabel="Labels"
            hitSlop={HIT}
          >
            <WaIcon name="label" size={21} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setHeaderMenuOpen(true)}
            accessibilityLabel="More options"
            hitSlop={HIT}
          >
            <WaIcon name="more" size={21} color="#fff" />
          </TouchableOpacity>
        </View>
      ),
    });
    // callCustomer and openMedia are re-created every render, so listing them
    // would reset the header on every poll tick. They only read props and state
    // that are already in this list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, name, phone, canViewJobs, customerId, WA]);

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
        // WhatsApp's own limit. At 10 a bigger selection was quietly trimmed.
        maxFiles: 30,
        ...PHOTO_QUALITY,
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

    await uploadPhotos(files);
  };

  // Straight to the camera, the way WhatsApp's own Camera tile behaves. Shares
  // the upload below with the gallery picker rather than repeating it.
  const takePhoto = async () => {
    if (!canSend || sending) return;

    let shot;

    try {
      shot = await ImagePicker.openCamera({
        mediaType: 'photo',
        ...PHOTO_QUALITY,
      });
    } catch (error) {
      if (error?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Could not open the camera.');
      }
      return;
    }

    if (shot) await uploadPhotos([shot]);
  };

  const uploadPhotos = async files => {
    // WhatsApp puts the caption on the first photo only.
    const caption = text.trim();
    setText('');
    setSending(true);

    let failed = 0;
    let reason = null;

    // Sequential on purpose: it keeps the bubbles in the order the agent
    // picked them, and one upload at a time is kinder to a phone connection.
    for (let i = 0; i < files.length; i += 1) {
      const image = files[i];

      showNote(
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

        // Same as the voice path: keep the refused bubble in the thread so it
        // can be sent again, instead of the photo disappearing.
        const rejected = error?.response?.data?.data;
        if (rejected?.id) appendLocal(rejected);

        // Meta's own reason is worth carrying — 'check your connection' is
        // wrong when the real problem is an expired token or the 24h window.
        if (typeof error?.response?.data?.message === 'string') {
          reason = error.response.data.message;
        }
      }
    }

    setUploadNote('');
    setSending(false);

    if (failed) {
      const summary =
        failed === files.length
          ? `None of those ${files.length} photos went through.`
          : `${failed} of ${files.length} did not send.`;

      // Meta's reason first when there is one, then where to find them: every
      // refused photo stays in the thread marked failed, with Resend on it.
      const where =
        ' They are in the thread marked failed — tap one and choose Resend.';

      Alert.alert(
        'Some photos did not send',
        `${reason ? reason + '\n\n' : ''}${summary}${where}`,
      );
    }
  };

  // A file downloaded in an earlier session is still on the phone, so the
  // bubbles have to find it again rather than offering to fetch it twice.
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const pending = messages.filter(
      m => m.media_url && !checkedRef.current.has(m.id),
    );

    if (!pending.length) return;
    pending.forEach(m => checkedRef.current.add(m.id));

    (async () => {
      const found = {};

      for (const message of pending) {
        const path = `${RNBlobUtil.fs.dirs.DownloadDir}/${downloadName(
          message,
          message.media_url,
        )}`;

        try {
          if (await RNBlobUtil.fs.exists(path)) found[message.id] = path;
        } catch (error) {
          // An unreadable path just means "not downloaded".
        }
      }

      if (Object.keys(found).length) setSavedFiles(prev => ({ ...prev, ...found }));
    })();
  }, [messages]);

  const threadPhotos = useMemo(
    () => messages.filter(m => m.type === 'image' && m.media_url && !m.deleted),
    [messages],
  );

  const stopPlayback = useCallback(async () => {
    try {
      await audioRecorder.stopPlayer();
    } catch (error) {
      // Already stopped, which is the state we wanted anyway.
    }

    audioRecorder.removePlayBackListener();
    audioRecorder.removePlaybackEndListener();
    setPlayingId(null);
    setPlayPos(0);
    setPlayDur(0);
  }, []);

  // Leaving the chat mid-message would otherwise keep playing over whatever
  // screen comes next.
  useEffect(() => () => {
    audioRecorder.removePlayBackListener();
    audioRecorder.removePlaybackEndListener();
    audioRecorder.stopPlayer().catch(() => {});
  }, []);

  // Plays the voice note in the thread. The downloaded copy is used when there
  // is one — no second trip over the network for a message already on the
  // phone — otherwise it streams from the server.
  const playVoice = async item => {
    // The recorder and the player are the same native object; recording wins.
    if (recording) return;

    if (playingId === item.id) {
      await stopPlayback();
      return;
    }

    if (playingId) await stopPlayback();

    const local = savedFiles[item.id];
    const source = local ? `file://${local}` : item.media_url;
    if (!source) return;

    try {
      setPlayingId(item.id);
      setPlayPos(0);
      setPlayDur(0);
      // Often enough for the counter to look live, rarely enough not to
      // re-render the thread five times a second.
      audioRecorder.setSubscriptionDuration(0.25);
      audioRecorder.addPlayBackListener(meta => {
        setPlayPos(meta.currentPosition);
        setPlayDur(meta.duration);
      });
      audioRecorder.addPlaybackEndListener(() => {
        stopPlayback();
      });

      await audioRecorder.startPlayer(source);
    } catch (error) {
      await stopPlayback();
      Alert.alert('Could not play', 'This voice message could not be played.');
    }
  };

  // Hands the file to whatever app on the phone handles that kind — the
  // gallery for a photo, a viewer for a document.
  const openSaved = async path => {
    try {
      await RNBlobUtil.android.actionViewIntent(path, mimeFor(path));
    } catch (error) {
      Alert.alert('Could not open', 'No app on this phone opens that file.');
    }
  };

  // Saves the file from inside the app, the way WhatsApp does, rather than
  // handing the link to the browser and throwing the agent out of the chat.
  //
  // Android's own DownloadManager does the work: it downloads in the
  // background, puts the file in Downloads with the usual notification, and
  // makes it visible to the Gallery. Nothing opens on top of the chat.
  //
  // Prefer the signed download link over the raw media URL: it streams the file
  // under its real name rather than the hash it is stored as.
  const downloadFile = async (downloadUrl, mediaUrl, meta) => {
    const url = downloadUrl || mediaUrl;
    if (!url) return;

    // Media saved before the public disk had a url configured is stored as a
    // bare path ("/storage/..."). Android has no idea what to do with a link
    // that has no scheme, which is what produced "no app can open that link".
    const absolute = /^https?:\/\//i.test(url)
      ? url
      : `${MEDIA_BASE_URL}/${String(url).replace(/^\//, '')}`;

    if (Platform.OS !== 'android') {
      // iOS has no DownloadManager; the share sheet is the way a file leaves
      // an app there.
      Linking.openURL(absolute).catch(() =>
        Alert.alert('Could not download', `Nothing on this phone can open:

${absolute}`),
      );
      return;
    }

    // Android 9 and below wrote to shared storage under a runtime permission;
    // 10 and up do not ask at all.
    if (Platform.Version <= 28) {
      const granted = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);

      if (granted !== RESULTS.GRANTED) {
        Alert.alert(
          'Storage permission needed',
          'Allow storage access to save files to this phone.',
        );
        return;
      }
    }

    const fileName = downloadName(meta, mediaUrl || url);
    showNote(`Saving ${fileName}…`);

    try {
      await RNBlobUtil.config({
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          title: fileName,
          description: 'Saving from RedChilli CRM',
          path: `${RNBlobUtil.fs.dirs.DownloadDir}/${fileName}`,
          // Without this a saved photo never turns up in the Gallery.
          mediaScannable: true,
        },
      }).fetch('GET', absolute);

      if (meta?.id) {
        setSavedFiles(prev => ({
          ...prev,
          [meta.id]: `${RNBlobUtil.fs.dirs.DownloadDir}/${fileName}`,
        }));
      }

      showNote(`Saved ${fileName} to Downloads`, false);
      // Long enough to read, short enough not to sit over the thread.
      setTimeout(() => setUploadNote(''), 2500);
    } catch (error) {
      setUploadNote('');
      Alert.alert('Could not download', `${fileName} could not be saved.`);
    }
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

  const openLocation = () => {
    // A link left over from the last place would silently send that one again.
    setLocLink('');
    setLocationOpen(true);
  };

  const readLocationLink = async ({ quiet = false } = {}) => {
    const url = locLink.trim();

    if (!url) {
      if (!quiet) {
        Alert.alert('Paste a link', 'Copy the link from Google Maps first.');
      }
      return null;
    }

    setReadingLink(true);

    try {
      const res = await whatsappAPI.resolveLocation(url);
      const place = res.data.place;

      setLocLat(String(place.latitude));
      setLocLng(String(place.longitude));
      // Only a suggestion: a name already typed is the agent's.
      if (place.name && !locName.trim()) setLocName(place.name);

      return place;
    } catch (error) {
      Alert.alert(
        'Could not read that link',
        error?.response?.data?.message
          || 'Open it in Google Maps, tap Share, and paste the link it gives you.',
      );
      return null;
    } finally {
      setReadingLink(false);
    }
  };

  const sendLocation = async () => {
    if (sending) return;

    const payload = { customer_id: customerId, mode: locMode };

    if (locMode === 'share') {
      let lat = parseFloat(locLat);
      let lng = parseFloat(locLng);

      // A pasted link is the whole answer: read it, then carry on sending.
      if ((isNaN(lat) || isNaN(lng)) && locLink.trim()) {
        const place = await readLocationLink();
        if (!place) return;

        lat = place.latitude;
        lng = place.longitude;
      }

      if (isNaN(lat) || isNaN(lng)) {
        Alert.alert(
          'No location yet',
          'Paste a Google Maps link, or enter the coordinates.',
        );
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

  const openProducts = () => {
    setProductsOpen(true);
    if (products.length === 0) loadProducts('');
  };

  const toggleProduct = id => {
    setChosenProducts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id],
    );
  };

  const sendProducts = async () => {
    if (sending) return;

    if (!chosenProducts.length) {
      Alert.alert('Pick some products', 'Tap the ones you want to send.');
      return;
    }

    setSending(true);

    try {
      const res = await whatsappAPI.sendProducts(
        customerId,
        chosenProducts,
        productNote.trim(),
      );
      // A message per product, so they all go into the thread.
      (res.data.messages || []).forEach(appendLocal);

      setProductsOpen(false);
      setChosenProducts([]);
      setProductNote('');
    } catch (error) {
      const data = error?.response?.data;
      // The ones that did go through still belong in the thread.
      (data?.messages || []).forEach(appendLocal);

      Alert.alert(
        'Not sent',
        typeof data?.message === 'string'
          ? data.message
          : 'WhatsApp rejected these products. If the customer has not messaged in the last 24 hours, send an approved template first.',
      );
    } finally {
      setSending(false);
    }
  };

  const loadLabels = useCallback(async () => {
    try {
      const res = await whatsappAPI.getLabels(customerId);
      setLabels(res.data.labels || []);
      setAppliedLabels((res.data.applied || []).map(String));
    } catch (error) {
      setLabels([]);
    }
  }, [customerId]);

  const openLabels = () => {
    setLabelsOpen(true);
    loadLabels();
  };

  const toggleCustomerLabel = async label => {
    if (labelBusy) return;

    const on = appliedLabels.includes(String(label.id));
    setLabelBusy(true);

    // Flip it here first: the round trip is a poll away from showing anyway,
    // and a tick that waits on the network feels broken.
    setAppliedLabels(prev =>
      on
        ? prev.filter(id => id !== String(label.id))
        : [...prev, String(label.id)],
    );

    try {
      await whatsappAPI.toggleLabel(customerId, label.id, !on);
    } catch (error) {
      await loadLabels();
      Alert.alert('Not saved', 'That label could not be changed.');
    } finally {
      setLabelBusy(false);
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
        ...PHOTO_QUALITY,
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
    if (!activeReply) return;

    const reply = activeReply;

    // Out of the way first, then send. Holding the sheet open while Meta takes
    // each photo made a saved reply feel slower than typing the message out.
    setSavedOpen(false);
    setActiveReply(null);
    // The shortcut that triggered this is still sitting in the box otherwise.
    if (text.trim().startsWith('/')) setText('');
    showNote('Sending saved reply...');

    try {
      const res = await whatsappAPI.sendSavedReply(customerId, reply.id);
      (res.data.messages || []).forEach(appendLocal);
    } catch (error) {
      // The sheet is gone by now, so a failure has to say so out loud.
      (error?.response?.data?.messages || []).forEach(appendLocal);

      Alert.alert(
        'Not sent',
        error?.response?.data?.message
          || 'WhatsApp rejected this reply. If the customer has not messaged in the last 24 hours, send an approved template first.',
      );
    } finally {
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

  // Send an outbound message again — mainly one that came back 'failed', since
  // WhatsApp has no retry of its own.
  const resendMessage = async message => {
    if (!message || sending) return;

    setActionMsg(null);
    setSending(true);

    try {
      const res = await whatsappAPI.resend(message.id);

      // The list is inverted, so the new bubble lands at the visual bottom on
      // its own — no scrolling to arrange.
      appendLocal(res.data.message);

      // A second failure looks identical to a success in the thread, so say so.
      if (res.data.status === 'failed') {
        Alert.alert(
          'Still not delivered',
          'WhatsApp refused it again. Check the number and the 24-hour window.',
        );
      }
    } catch (error) {
      Alert.alert(
        'Could not resend',
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
      // A refusal still returns the bubble under data, so put it in the thread:
      // it shows as failed and can be sent again from the long-press sheet,
      // rather than the recording vanishing with only an alert to show for it.
      const failed = error?.response?.data?.data;
      if (failed?.id) appendLocal(failed);

      Alert.alert(
        'Not sent',
        typeof error?.response?.data?.message === 'string'
          ? error.response.data.message
          : 'Could not send that voice message.',
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

  // Delivery state as WhatsApp draws it: a clock while pending, one tick sent,
  // two delivered, two blue read. Text glyphs never lined up with the timestamp
  // and the emoji clock rendered at a different size on every device.
  // A clock until WhatsApp has it, one tick once sent, two on delivery, two in
  // blue once read — and a warning triangle when it was refused.
  const renderTick = status => {
    if (status === 'failed') {
      return <WaIcon name="alert" size={13} color={C.danger} />;
    }

    if (status === 'read') {
      return <WaTicks double size={16} color={WA.tickRead} />;
    }

    if (status === 'delivered') {
      return <WaTicks double size={16} color={WA.tick} />;
    }

    if (status === 'sent') {
      return <WaTicks double={false} size={16} color={WA.tick} />;
    }

    return <WaIcon name="clock" size={12} color={WA.tick} />;
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
                  {/* Tapping the picture opens it here, full screen, the way
                      WhatsApp does — not in the phone's gallery app. */}
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() =>
                      openViewer(
                        threadPhotos,
                        threadPhotos.findIndex(m => m.id === item.id),
                      )
                    }
                    accessibilityLabel="Open photo"
                  >
                    <Image source={{ uri: item.media_url }} style={styles.media} />
                  </TouchableOpacity>

                  {/* Nothing left to fetch once it is on the phone. */}
                  {!savedFiles[item.id] && (
                    <TouchableOpacity
                      style={styles.mediaDl}
                      onPress={() =>
                        downloadFile(item.download_url, item.media_url, item)
                      }
                      accessibilityLabel="Download"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.mediaDlIcon}>⤓</Text>
                    </TouchableOpacity>
                  )}
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
                    {item.type === 'audio' ? (
                      // A voice note plays here, in the bubble, the way it does
                      // in WhatsApp — the round button on the left, not a
                      // hand-off to whatever player the phone happens to have.
                      <TouchableOpacity
                        style={styles.voiceBtn}
                        onPress={() => playVoice(item)}
                        accessibilityLabel={
                          playingId === item.id ? 'Pause' : 'Play voice message'
                        }
                      >
                        <WaIcon
                          name={playingId === item.id ? 'pause' : 'play'}
                          size={18}
                          color="#fff"
                        />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.fileBadge}>
                        <Text style={styles.fileBadgeText}>{fileExt(item)}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.fileOpen}
                      onPress={() =>
                        item.type === 'audio'
                          ? playVoice(item)
                          : savedFiles[item.id]
                            ? openSaved(savedFiles[item.id])
                            : Linking.openURL(item.media_url)
                      }
                    >
                      <Text style={styles.fileName} numberOfLines={2}>
                        {fileLabel(item)}
                      </Text>
                      <Text style={styles.fileSub}>
                        {item.type === 'audio'
                          ? playingId === item.id
                            ? `${audioRecorder.mmss(
                                Math.floor(playPos / 1000),
                              )} / ${audioRecorder.mmss(
                                Math.floor(playDur / 1000),
                              )}`
                            : 'Tap to play'
                          : savedFiles[item.id]
                            ? 'Saved · tap to open'
                            : 'Tap to open'}
                      </Text>
                    </TouchableOpacity>

                    {/* Nothing left to fetch once it is on the phone. */}
                    {!savedFiles[item.id] && (
                      <TouchableOpacity
                        style={styles.fileDl}
                        onPress={() =>
                          downloadFile(item.download_url, item.media_url, item)
                        }
                        accessibilityLabel="Download"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.fileDlIcon}>⤓</Text>
                      </TouchableOpacity>
                    )}
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
            {!!item.pinned && (
              <WaIcon name="pin" size={12} color={WA.tick} />
            )}
            {!!item.starred && (
              <WaIcon name="star" size={12} color={WA.tick} />
            )}
            {!!item.reaction && (
              <Text style={styles.reaction}>{item.reaction}</Text>
            )}
            <Text style={styles.time}>{time}</Text>
            {out && renderTick(item.status)}
          </View>
        </TouchableOpacity>

        {/* WhatsApp's own mark for a message that did not go: a red ! beside
            the bubble, always visible, and tapping it sends the content again.
            The long-press menu still has Resend, but a failure should not need
            hunting for. */}
        {out && item.status === 'failed' && item.forwardable && canSend && (
          <TouchableOpacity
            style={styles.failMark}
            onPress={() => resendMessage(item)}
            accessibilityLabel="Not delivered. Tap to send again."
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.failMarkText}>!</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading conversation..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      // 'padding' on Android too, not undefined. Undefined leaves it to the
      // window resizing itself under adjustResize, and Android 15 stopped doing
      // that for edge-to-edge apps — which is why the composer vanished under
      // the keyboard on newer phones and was fine on older ones. Padding is
      // measured from the keyboard's own frame, so it comes out at zero on the
      // phones where the window still resizes: correct either way.
      behavior="padding"
      // The view starts at the top of the window on Android, so there is nothing
      // to compensate for; on iOS it sits below the header.
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Behind everything: absolutely positioned, so it does not affect layout
          and the list scrolls over a still background the way WhatsApp's does. */}
      <WaWallpaper dark={dark} background={WA.chatBg} />

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
          <WaIcon name="pin" size={16} color={WA.icon} />

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
          {noteBusy && <ActivityIndicator color={WA.accent} size="small" />}
          <Text style={styles.uploadNoteText}>{uploadNote}</Text>
        </View>
      )}

      {canSend && recording ? (
        <View style={[styles.composer, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity style={styles.attachBtn} onPress={cancelRecording}>
            <WaIcon name="trash" size={22} color={C.danger} />
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
              <WaIcon name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      ) : canSend ? (
        <View
          style={[
            styles.composerWrap,
            { paddingBottom: emojiOpen ? 8 : insets.bottom + 8 },
          ]}
        >
          <View style={styles.composerRow}>
            {/* Everything except send lives inside one rounded field, the way
                WhatsApp lays it out: emoji left, then the text, then the
                attachment and camera shortcuts on the right. */}
            <View style={styles.inputPill}>
              <TouchableOpacity
                style={styles.pillIcon}
                onPress={toggleEmoji}
                accessibilityLabel={emojiOpen ? 'Keyboard' : 'Emoji'}
              >
                <WaIcon
                  name={emojiOpen ? 'keyboard' : 'emoji'}
                  size={24}
                  color={WA.iconMuted}
                />
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Message"
                placeholderTextColor={WA.textMuted}
                value={text}
                onChangeText={setText}
                selection={selection}
                onSelectionChange={e => {
                  caret.current = e.nativeEvent.selection;
                }}
                // Reaching for the keyboard is how you dismiss the panel.
                onFocus={() => setEmojiOpen(false)}
                multiline
              />

              <TouchableOpacity
                style={styles.pillIcon}
                onPress={() => setAttachOpen(true)}
                accessibilityLabel="Attach a file"
              >
                <WaIcon name="attach" size={22} color={WA.iconMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pillIcon}
                onPress={takePhoto}
                accessibilityLabel="Take a photo"
              >
                <WaIcon name="camera" size={22} color={WA.iconMuted} />
              </TouchableOpacity>
            </View>

            {/* The round button outside the pill: a mic until there is
                something to send, then send. */}
            <TouchableOpacity
              style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
              onPress={text.trim() ? send : startRecording}
              disabled={sending}
              accessibilityLabel={text.trim() ? 'Send' : 'Record a voice message'}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <WaIcon
                  name={text.trim() ? 'send' : 'mic'}
                  size={22}
                  color="#fff"
                />
              )}
            </TouchableOpacity>
          </View>

          {emojiOpen && (
            <View style={styles.emojiWrap}>
              <EmojiPicker
                dark={dark}
                WA={WA}
                onPick={replaceAtCaret}
                onBackspace={backspace}
              />
              {/* Fills the gesture bar so the tab row is not cut in half. */}
              <View style={[styles.emojiSafe, { height: insets.bottom }]} />
            </View>
          )}
        </View>
      ) : (
        <Text style={[styles.noPermission, { paddingBottom: insets.bottom + 8 }]}>
          You don't have permission to send WhatsApp messages.
        </Text>
      )}

      <Modal
        visible={headerMenuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setHeaderMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.attachBackdrop}
          activeOpacity={1}
          onPress={() => setHeaderMenuOpen(false)}
        >
          <View style={[styles.attachPanel, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.attachGrab} />

            <View style={styles.attachGrid}>
              {HEADER_ITEMS.filter(tile => tile.enabled()).map(
                tile => (
                  <TouchableOpacity
                    key={tile.id}
                    style={styles.attachTile}
                    onPress={() => {
                      setHeaderMenuOpen(false);
                      tile.run({ openMedia, setSearchOpen });
                    }}
                  >
                    <View style={styles.attachCircle}>
                      <WaIcon name={tile.icon} size={26} color={tile.color} />
                    </View>

                    <Text style={styles.attachLabel}>{tile.label}</Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={labelsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLabelsOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Labels for {name || phone}</Text>

            <ScrollView style={styles.modalScroll}>
              {labels.length === 0 ? (
                <Text style={styles.modalHint}>
                  No labels yet. Create them from the chat list's menu.
                </Text>
              ) : (
                labels.map(l => {
                  const on = appliedLabels.includes(String(l.id));

                  return (
                    <TouchableOpacity
                      key={l.id}
                      style={styles.labelRow}
                      onPress={() => toggleCustomerLabel(l)}
                    >
                      <View
                        style={[styles.labelDot, { backgroundColor: l.color }]}
                      />
                      <Text style={styles.labelName} numberOfLines={1}>
                        {l.name}
                      </Text>
                      <Text style={styles.labelTick}>{on ? '✓' : ''}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setLabelsOpen(false)}
              >
                <Text style={styles.modalCancelText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={attachOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAttachOpen(false)}
      >
        <TouchableOpacity
          style={styles.attachBackdrop}
          activeOpacity={1}
          onPress={() => setAttachOpen(false)}
        >
          <View style={[styles.attachPanel, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.attachGrab} />

            <View style={styles.attachGrid}>
              {ATTACH_ITEMS.filter(tile => tile.enabled({
                canProducts,
                canTemplate,
              })).map(tile => (
                <TouchableOpacity
                  key={tile.id}
                  style={styles.attachTile}
                  onPress={() => {
                    setAttachOpen(false);
                    tile.run({
                      attach,
                      takePhoto,
                      openLocation,
                      openProducts,
                      openTemplates,
                      openSavedReplies,
                    });
                  }}
                >
                  <View style={styles.attachCircle}>
                    <WaIcon name={tile.icon} size={26} color={tile.color} />
                  </View>

                  <Text style={styles.attachLabel}>{tile.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

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

            {actionMsg?.direction === 'out' && actionMsg?.forwardable && (
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={() => resendMessage(actionMsg)}
              >
                <Text style={styles.sheetText}>
                  {actionMsg?.status === 'failed'
                    ? 'Send again — this one failed'
                    : 'Send again'}
                </Text>
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
              placeholderTextColor={WA.textMuted}
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
              placeholderTextColor={WA.textMuted}
              value={searchTerm}
              onChangeText={runSearch}
              autoFocus
            />

            {searching ? (
              <ActivityIndicator color={WA.accent} style={styles.modalLoader} />
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
              <ActivityIndicator color={WA.accent} style={styles.modalLoader} />
            ) : (
              <ScrollView style={styles.modalScroll}>
                {(mediaData[mediaTab] || []).length === 0 ? (
                  <Text style={styles.modalHint}>
                    Nothing shared in this chat yet.
                  </Text>
                ) : mediaTab === 'media' ? (
                  <View style={styles.mediaGrid}>
                    {mediaData.media.map((m, index) => (
                      <View key={m.id} style={styles.mediaWrap}>
                        <TouchableOpacity
                          onPress={() => {
                            setMediaOpen(false);
                            openViewer(
                              mediaData.media.map(photo => ({
                                ...photo,
                                media_url: photo.url,
                              })),
                              index,
                            );
                          }}
                        >
                          <Image source={{ uri: m.url }} style={styles.thumb} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.mediaDl}
                          onPress={() => downloadFile(m.download_url, m.url, m)}
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
                          onPress={() =>
                            downloadFile(item.download_url, item.url, item)
                          }
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
                  placeholder="Paste a Google Maps link"
                  placeholderTextColor={WA.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={locLink}
                  onChangeText={setLocLink}
                />
                <TouchableOpacity
                  style={[styles.locateBtn, readingLink && styles.disabled]}
                  onPress={() => readLocationLink()}
                  disabled={readingLink}
                >
                  {readingLink ? (
                    <ActivityIndicator color={WA.accent} size="small" />
                  ) : (
                    <Text style={styles.locateBtnText}>Read link</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.modalHint}>
                  In Google Maps, tap Share and copy the link. WhatsApp needs a
                  pin, so the link is read into one — hit Send and it happens on
                  its own.
                </Text>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Place name (optional)"
                  placeholderTextColor={WA.textMuted}
                  value={locName}
                  onChangeText={setLocName}
                />
                <TouchableOpacity
                  style={[styles.locateBtn, locatingMe && styles.disabled]}
                  onPress={useMyLocation}
                  disabled={locatingMe}
                >
                  {locatingMe ? (
                    <ActivityIndicator color={WA.accent} size="small" />
                  ) : (
                    <Text style={styles.locateBtnText}>Use my current location</Text>
                  )}
                </TouchableOpacity>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Latitude"
                  placeholderTextColor={WA.textMuted}
                  value={locLat}
                  onChangeText={setLocLat}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Longitude"
                  placeholderTextColor={WA.textMuted}
                  value={locLng}
                  onChangeText={setLocLng}
                />
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
              {chosenTemplate ? chosenTemplate.name : 'Send an FB Template'}
            </Text>

            {loadingTemplates ? (
              <ActivityIndicator color={WA.accent} style={styles.modalLoader} />
            ) : chosenTemplate ? (
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.templateBody}>{chosenTemplate.body_text}</Text>

                {variables.map((value, i) => (
                  <TextInput
                    key={i}
                    style={styles.modalInput}
                    placeholder={`Value for {{${i + 1}}}`}
                    placeholderTextColor={WA.textMuted}
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
                <ActivityIndicator color={WA.accent} style={styles.modalLoader} />
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
                  placeholderTextColor={WA.textMuted}
                  value={replyTitle}
                  onChangeText={setReplyTitle}
                />

                <TextInput
                  style={styles.modalInput}
                  placeholder="Shortcut, e.g. price (optional)"
                  placeholderTextColor={WA.textMuted}
                  autoCapitalize="none"
                  value={replyShortcut}
                  onChangeText={setReplyShortcut}
                />

                <TextInput
                  style={[styles.modalInput, styles.modalInputTall]}
                  placeholder="Message text"
                  placeholderTextColor={WA.textMuted}
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
        visible={!!viewing}
        transparent
        animationType="fade"
        onRequestClose={() => setViewing(null)}
      >
        {(() => {
          const photo = viewing?.list[viewing.index];
          const hasPrev = !!viewing && viewing.index > 0;
          const hasNext = !!viewing && viewing.index < viewing.list.length - 1;

          return (
            <View style={styles.viewer}>
              <View style={[styles.viewerBar, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity
                  style={styles.viewerBtn}
                  onPress={() => setViewing(null)}
                  accessibilityLabel="Close"
                >
                  <WaIcon name="close" size={22} color="#fff" />
                </TouchableOpacity>

                {!!viewing && viewing.list.length > 1 && (
                  <Text style={styles.viewerCount}>
                    {viewing.index + 1} of {viewing.list.length}
                  </Text>
                )}

                {!!photo && !savedFiles[photo.id] ? (
                  <TouchableOpacity
                    style={styles.viewerBtn}
                    onPress={() =>
                      downloadFile(photo.download_url, photo.media_url, photo)
                    }
                    accessibilityLabel="Download"
                  >
                    <WaIcon name="download" size={22} color="#fff" />
                  </TouchableOpacity>
                ) : (
                  // Balances the close button so the counter stays centred.
                  <View style={styles.viewerBtn} />
                )}
              </View>

              <View style={styles.viewerBody}>
                {!!photo && (
                  // Keyed on the photo so moving to the next one starts it
                  // unzoomed rather than inheriting the last one's pinch.
                  <ZoomableImage
                    key={photo.id ?? viewing.index}
                    uri={photo.media_url}
                    onTap={closeViewer}
                    onSwipeLeft={hasNext ? showNextPhoto : undefined}
                    onSwipeRight={hasPrev ? showPrevPhoto : undefined}
                  />
                )}
              </View>

              {!!photo && !isPlaceholderBody(photo.body) && (
                <Text
                  style={[
                    styles.viewerCaption,
                    { paddingBottom: insets.bottom + 12 },
                  ]}
                >
                  {photo.body}
                </Text>
              )}
            </View>
          );
        })()}
      </Modal>

      <Modal
        visible={productsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setProductsOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Send product</Text>

            <ScrollView style={styles.modalScroll}>
              <TextInput
                style={styles.modalInput}
                placeholder="Search products by name or code"
                placeholderTextColor={WA.textMuted}
                value={productSearch}
                onChangeText={term => {
                  setProductSearch(term);
                  loadProducts(term);
                }}
              />

              {loadingProducts ? (
                <ActivityIndicator color={WA.accent} style={styles.modalLoader} />
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

              <TextInput
                style={[styles.modalInput, styles.modalInputTall]}
                placeholder="Your message (optional)"
                placeholderTextColor={WA.textMuted}
                multiline
                value={productNote}
                onChangeText={setProductNote}
              />

              <Text style={styles.modalHint}>
                Each product goes as its own picture with the name, code and price
                underneath. Your message, if you write one, is sent first.
              </Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setProductsOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalPrimary, sending && styles.disabled]}
                onPress={sendProducts}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalPrimaryText}>
                    {`Send${chosenProducts.length ? ` (${chosenProducts.length})` : ''}`}
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

const makeStyles = T => StyleSheet.create({
  container: { flex: 1, backgroundColor: T.chatBg },
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
  attachBackdrop: {
    flex: 1,
    backgroundColor: T.backdrop,
    justifyContent: 'flex-end',
  },
  attachPanel: {
    backgroundColor: T.panel,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 12,
  },
  // The little handle at the top of a bottom sheet.
  attachGrab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.divider,
    marginBottom: 18,
  },
  attachGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // Four to a row, so a fifth and sixth tile wrap into a second row the way
  // WhatsApp's sheet does.
  attachTile: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 18,
  },
  // A rounded chip rather than a circle, matching WhatsApp's current sheet.
  attachCircle: {
    width: 68,
    height: 52,
    borderRadius: 18,
    backgroundColor: T.panelAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachLabel: {
    marginTop: 7,
    fontSize: 12,
    color: T.textMuted,
    textAlign: 'center',
  },
  bubbleOut: { backgroundColor: T.bubbleOut },
  bubbleIn: { backgroundColor: T.bubbleIn },
  bubbleFlash: { backgroundColor: T.bubbleFlash },
  body: { fontSize: 14.5, color: T.text },
  deleted: { fontSize: 14, color: T.textMuted, fontStyle: 'italic' },
  link: { fontSize: 14.5, color: T.accent, textDecorationLine: 'underline' },
  inlineLink: { color: T.accent, textDecorationLine: 'underline' },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: T.badge,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginBottom: 4,
  },
  quoteWho: { fontSize: 11.5, fontWeight: '700', color: T.badge },
  quoteBody: { fontSize: 12, color: T.textMuted },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.panel,
    borderTopWidth: 1,
    borderTopColor: T.divider,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  replyBarMeta: { flex: 1, minWidth: 0 },
  replyBarX: { paddingHorizontal: 10 },
  replyBarXText: { fontSize: 20, color: T.textMuted },
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
  sheetItem: { paddingHorizontal: 20, paddingVertical: 14 },
  sheetText: { fontSize: 15, color: T.text },
  sheetDanger: { fontSize: 15, color: C.danger },
  sheetDivider: { height: 1, backgroundColor: T.divider, marginVertical: 6 },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.divider,
  },
  reactionBtn: { padding: 8, borderRadius: 20 },
  reactionBtnOn: { backgroundColor: T.bubbleOut },
  reactionEmoji: { fontSize: 24 },
  recBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.panelAlt,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E53E3E' },
  recTime: { fontSize: 14, fontWeight: '700', color: T.text },
  recHint: { fontSize: 12.5, color: T.textMuted },
  locateBtn: {
    borderWidth: 1,
    borderColor: T.accent,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  locateBtnText: { color: T.accent, fontWeight: '600', fontSize: 13.5 },
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
    borderLeftColor: T.badge,
    borderRadius: 6,
    padding: 6,
    marginBottom: 6,
  },
  adThumb: { width: 52, height: 52, borderRadius: 4 },
  adMeta: { flex: 1, minWidth: 0 },
  adTag: { fontSize: 10, fontWeight: '700', color: T.badge, letterSpacing: 0.3 },
  adHeadline: {
    fontSize: 12.5,
    fontWeight: '600',
    color: T.text,
    marginTop: 1,
  },
  adBody: { fontSize: 11.5, color: T.textMuted, marginTop: 1 },
  adLink: { fontSize: 11, color: T.accent, fontWeight: '600', marginTop: 3 },
  media: { width: 200, height: 200, borderRadius: 8, marginBottom: 4 },
  failMark: {
    alignSelf: 'center',
    marginHorizontal: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.danger,
  },
  failMarkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 17,
  },
  // Black, not the theme's background: a photo is judged against black on
  // every phone gallery there is.
  viewer: { flex: 1, backgroundColor: '#000' },
  viewerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  viewerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  viewerBody: { flex: 1 },
  viewerCount: { color: '#fff', fontSize: 14, alignSelf: 'center' },
  viewerCaption: {
    color: '#fff',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 10,
    textAlign: 'center',
  },
  mediaWrap: { position: 'relative' },
  pinBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: T.panelAlt,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.divider,
  },
  pinText: { flex: 1, minWidth: 0, fontSize: 12.5, color: T.textMuted },
  pinCount: { fontSize: 11, fontWeight: '700', color: '#B58900' },
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
    backgroundColor: T.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  fileName: { fontSize: 13.5, fontWeight: '600', color: T.text },
  fileSub: { fontSize: 11, color: T.textMuted, marginTop: 1 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 200 },
  fileOpen: { flex: 1, minWidth: 0 },
  voiceBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.green,
  },
  fileDl: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileDlIcon: { fontSize: 15, fontWeight: '700', color: T.textMuted, lineHeight: 18 },
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
  time: { fontSize: 10.5, color: T.textMuted },
  // Ticks are icons now; only the timestamp beside them is text.
  list: { flex: 1 },
  composerWrap: {
    backgroundColor: T.panel,
    borderTopWidth: 1,
    borderTopColor: T.divider,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 8,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  // Negative margins cancel the composer's padding so the panel runs to the
  // screen edges, the way the keyboard it stands in for does.
  emojiWrap: {
    marginTop: 6,
    marginHorizontal: -8,
    marginBottom: -8,
  },
  emojiSafe: { backgroundColor: T.panelAlt },
  inputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: T.panelAlt,
    borderRadius: 26,
    paddingHorizontal: 6,
    // Caps the height so a long message scrolls inside the pill instead of
    // pushing the thread off the screen.
    maxHeight: 120,
  },
  pillIcon: {
    width: 38,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: T.panel,
    borderTopWidth: 1,
    borderTopColor: T.divider,
    gap: 8,
  },
  prodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.divider,
  },
  prodRowOn: { backgroundColor: T.accentLight },
  prodThumb: { width: 44, height: 44, borderRadius: 6 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.divider,
  },
  labelDot: { width: 12, height: 12, borderRadius: 6 },
  labelName: { flex: 1, fontSize: 14.5, color: T.text },
  labelTick: { fontSize: 16, fontWeight: '700', color: T.green, width: 18 },
  prodTick: { fontSize: 16, fontWeight: '700', color: T.accent, width: 18 },
  shortcutPop: {
    backgroundColor: T.panel,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.divider,
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.divider,
  },
  shortcutThumb: { width: 34, height: 34, borderRadius: 6 },
  shortcutThumbEmpty: { backgroundColor: T.panelAlt },
  shortcutMeta: { flex: 1, minWidth: 0 },
  shortcutTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shortcutTitle: {
    flexShrink: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: T.text,
  },
  shortcutTag: {
    fontSize: 11,
    fontWeight: '700',
    color: T.accent,
    backgroundColor: T.accentLight,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignSelf: 'flex-start',
  },
  shortcutBody: { fontSize: 12, color: T.textMuted, marginTop: 2 },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.divider,
  },
  replyRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  replyThumb: { width: 44, height: 44, borderRadius: 8 },
  replyTitle: {
    flexShrink: 1,
    fontSize: 14.5,
    fontWeight: '700',
    color: T.text,
  },
  replyRowBtn: { paddingHorizontal: 6, paddingVertical: 6 },
  replyRowIcon: { fontSize: 16, color: T.textMuted },
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
    backgroundColor: T.panelAlt,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.divider,
  },
  uploadNoteText: { fontSize: 12.5, color: T.textMuted, fontWeight: '600' },
  attachBtn: { paddingHorizontal: 6, paddingVertical: 8 },
  input: {
    flex: 1,
    maxHeight: 110,
    paddingHorizontal: 4,
    paddingVertical: 8,
    fontSize: 14.5,
    color: T.text,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: T.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: T.backdrop,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: T.panel,
    borderRadius: 12,
    padding: 18,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: T.text, marginBottom: 12 },
  modalScroll: { maxHeight: 340 },
  modalLoader: { marginVertical: 24 },
  modalInput: {
    backgroundColor: T.panelAlt,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14.5,
    color: T.text,
    marginBottom: 10,
  },
  modalHint: { fontSize: 12.5, color: T.textMuted, marginVertical: 8 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  modalCancel: { paddingHorizontal: 14, paddingVertical: 10 },
  modalCancelText: { color: T.textMuted, fontWeight: '600' },
  modalPrimary: {
    backgroundColor: T.badge,
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
    borderBottomColor: T.divider,
  },
  templateName: { fontWeight: '600', fontSize: 14.5, color: T.text },
  templateMeta: { fontSize: 12, color: T.textMuted, marginTop: 2 },
  templateBody: {
    fontSize: 13.5,
    color: T.textMuted,
    marginBottom: 12,
    lineHeight: 19,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // Leaves the back arrow its room and keeps a long name off the icons.
    maxWidth: 200,
  },
  headerName: {
    flexShrink: 1,
    color: '#fff',
    fontSize: 17,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // Four buttons now, so they close up a little to leave the customer's name
    // somewhere to be.
    gap: 14,
    marginRight: 12,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: T.divider,
    marginBottom: 10,
  },
  tab: { paddingHorizontal: 14, paddingVertical: 8 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: T.badge },
  tabText: { color: T.textMuted, fontSize: 13.5 },
  tabTextActive: { color: T.badge, fontWeight: '700' },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  thumb: { width: 92, height: 92, borderRadius: 6, backgroundColor: T.panelAlt },
  searchWhen: { fontSize: 11, color: T.textMuted, marginTop: 2 },
  noPermission: {
    textAlign: 'center',
    color: T.textMuted,
    padding: 16,
    backgroundColor: T.panel,
  },
});

// Built once each, not per render.
const LIGHT_STYLES = makeStyles(WA_LIGHT);
const DARK_STYLES = makeStyles(WA_DARK);

export default WhatsAppThreadScreen;
