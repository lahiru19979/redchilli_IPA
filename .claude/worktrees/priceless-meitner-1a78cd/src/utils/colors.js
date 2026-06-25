// Predefined colors for products (T-shirts, garments, etc.)
export const PRODUCT_COLORS = [
  { id: 'white', name: 'White', code: '#FFFFFF' },
  { id: 'black', name: 'Black', code: '#000000' },
  { id: 'navy', name: 'Navy Blue', code: '#000080' },
  { id: 'royal_blue', name: 'Royal Blue', code: '#4169E1' },
  { id: 'sky_blue', name: 'Sky Blue', code: '#87CEEB' },
  { id: 'red', name: 'Red', code: '#FF0000' },
  { id: 'maroon', name: 'Maroon', code: '#800000' },
  { id: 'green', name: 'Green', code: '#008000' },
  { id: 'dark_green', name: 'Dark Green', code: '#006400' },
  { id: 'yellow', name: 'Yellow', code: '#FFFF00' },
  { id: 'orange', name: 'Orange', code: '#FFA500' },
  { id: 'pink', name: 'Pink', code: '#FFC0CB' },
  { id: 'purple', name: 'Purple', code: '#800080' },
  { id: 'grey', name: 'Grey', code: '#808080' },
  { id: 'light_grey', name: 'Light Grey', code: '#D3D3D3' },
  { id: 'brown', name: 'Brown', code: '#8B4513' },
  { id: 'beige', name: 'Beige', code: '#F5F5DC' },
  { id: 'cream', name: 'Cream', code: '#FFFDD0' },
  { id: 'olive', name: 'Olive', code: '#808000' },
  { id: 'teal', name: 'Teal', code: '#008080' },
];

export const getColorByID = (colorId) => {
  return PRODUCT_COLORS.find(c => c.id === colorId) || PRODUCT_COLORS[0];
};

export const getColorName = (colorId) => {
  const color = getColorByID(colorId);
  return color ? color.name : 'White';
};

export const getColorCode = (colorId) => {
  const color = getColorByID(colorId);
  return color ? color.code : '#FFFFFF';
};