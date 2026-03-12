// Status code mapping for your invoices
export const INVOICE_STATUS = {
  '1': { label: 'Pending', color: '#FF9800' },
  '2': { label: 'Processing', color: '#2196F3' },
  '3': { label: 'Shipped', color: '#9C27B0' },
  '4': { label: 'Delivered', color: '#4CAF50' },
  '5': { label: 'Cancelled', color: '#F44336' },
  '6': { label: 'Returned', color: '#795548' },
  '7': { label: 'Refunded', color: '#607D8B' },
  '8': { label: 'On Hold', color: '#FF5722' },
  '9': { label: 'Completed', color: '#4CAF50' },
  '10': { label: 'Failed', color: '#F44336' },
  '11': { label: 'Paid', color: '#4CAF50' },
  '12': { label: 'Unpaid', color: '#FF9800' },
  // Add more status codes as per your system
};

export const getStatusInfo = (statusCode) => {
  const status = INVOICE_STATUS[String(statusCode)];
  console.log(`[STATUS] Input: ${statusCode} (type: ${typeof statusCode}) → ${status?.label ?? 'UNKNOWN'}`);
  return status || { label: 'Unknown', color: '#9E9E9E' };
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