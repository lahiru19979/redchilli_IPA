// utils/sizes.js

export const SIZES = [
  { id: 'xs', name: 'XS', label: 'Extra Small' },
  { id: 's', name: 'S', label: 'Small' },
  { id: 'm', name: 'M', label: 'Medium' },
  { id: 'l', name: 'L', label: 'Large' },
  { id: 'xl', name: 'XL', label: 'Extra Large' },
  { id: 'xxl', name: 'XXL', label: '2X Large' },
  { id: 'xxxl', name: 'XXXL', label: '3X Large' },
  { id: '4xl', name: '4XL', label: '4X Large' },
  { id: '5xl', name: '5XL', label: '5X Large' },
];

// Numeric sizes (for pants, etc.)
export const NUMERIC_SIZES = [
  { id: '28', name: '28', label: 'Size 28' },
  { id: '30', name: '30', label: 'Size 30' },
  { id: '32', name: '32', label: 'Size 32' },
  { id: '34', name: '34', label: 'Size 34' },
  { id: '36', name: '36', label: 'Size 36' },
  { id: '38', name: '38', label: 'Size 38' },
  { id: '40', name: '40', label: 'Size 40' },
  { id: '42', name: '42', label: 'Size 42' },
  { id: '44', name: '44', label: 'Size 44' },
];

// Get all sizes (combine both types if needed)
export const getAllSizes = (type = 'letter') => {
  if (type === 'numeric') return NUMERIC_SIZES;
  if (type === 'all') return [...SIZES, ...NUMERIC_SIZES];
  return SIZES;
};

// Get size by ID
export const getSizeByID = (sizeId) => {
  const allSizes = [...SIZES, ...NUMERIC_SIZES];
  return allSizes.find(size => size.id === sizeId) || { id: 'm', name: 'M', label: 'Medium' };
};

export default SIZES;