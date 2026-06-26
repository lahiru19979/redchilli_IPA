// The backend (InvoiceAPIController) now returns a ready-made `status_label`
// that mirrors the web "all job order" list. Here we just pick a colour for it.
// Order matters: more specific keywords are checked first.
const STATUS_COLOR_RULES = [
  { keywords: ['payment received', 'paid', 'fulfilled', 'refunded', 'completed', 'delivered'], color: '#4CAF50' },
  { keywords: ['new enquiry'], color: '#FF9800' }, // cancellation / refund requested
  { keywords: ['cancel', 'failed', 'reject'], color: '#F44336' },
  { keywords: ['pending', 'hold'], color: '#FF9800' },
  { keywords: ['confirm', 'process', 'dispatch', 'initiat', 'ship'], color: '#2196F3' },
];

export const getStatusInfo = (statusLabel) => {
  const label =
    statusLabel === null || statusLabel === undefined || statusLabel === ''
      ? 'No Status'
      : String(statusLabel);

  const lower = label.toLowerCase();
  let color = '#9E9E9E'; // default / "No Status"
  for (const rule of STATUS_COLOR_RULES) {
    if (rule.keywords.some(k => lower.includes(k))) {
      color = rule.color;
      break;
    }
  }
  return { label, color };
};

// Format currency (removes existing formatting and reformats)
export const formatCurrency = (value) => {
  if (!value) return '0.00';

  // Remove existing commas and convert to number
  const numValue = typeof value === 'string'
    ? parseFloat(value.replace(/,/g, ''))
    : value;

  if (isNaN(numValue)) return '0.00';

  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Format date
export const formatDate = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
