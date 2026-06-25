// components/ProductItem.js

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getColorByID } from '../utils/colors';
import { getSizeByID } from '../utils/sizes';
import ColorPicker from './ColorPicker';
import SizePicker from './SizePicker';

const ProductItem = ({
  product,
  quantity,
  selectedPrice = 'sell_price1',
  selectedColor = 'white',
  selectedSize = 'm', // Add default size
  onIncrement,
  onDecrement,
  onRemove,
  onChangePrice,
  onChangeColor,
  onChangeSize, // Add size change handler
  sizeType = 'letter', // 'letter', 'numeric', or 'all'
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);

  // Get price value
  const getPrice = () => {
    const price = product[selectedPrice] || product.sell_price1 || '0';
    return typeof price === 'string' ? parseFloat(price.replace(/,/g, '')) : price;
  };

  const price = getPrice();
  const subtotal = price * quantity;

  // Get color info
  const colorInfo = getColorByID(selectedColor);
  
  // Get size info
  const sizeInfo = getSizeByID(selectedSize);

  // Format style name
  const formatStyle = (style) => {
    if (!style) return '';
    return style.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <View style={styles.container}>
      {/* Product Info */}
      <View style={styles.productInfo}>
        {/* Item Code */}
        <Text style={styles.itemCode}>{product.item_code}</Text>

        {/* Product Name */}
        <Text style={styles.productName}>{product.item_name}</Text>

        {/* Details Row */}
        <View style={styles.detailsRow}>
          <View style={styles.detailChip}>
            <Text style={styles.detailText}>GSM: {product.gsm}</Text>
          </View>
          <View style={styles.detailChip}>
            <Text style={styles.detailText}>{formatStyle(product.style)}</Text>
          </View>
        </View>

        {/* Color & Size Row */}
        <View style={styles.selectorsRow}>
          {/* Color Selection */}
          <TouchableOpacity
            style={[styles.selector, styles.colorSelector]}
            onPress={() => setShowColorPicker(true)}>
            <View
              style={[
                styles.colorPreview,
                { backgroundColor: colorInfo.code },
                colorInfo.id === 'white' && styles.colorPreviewBorder,
              ]}
            />
            <View style={styles.selectorInfo}>
              <Text style={styles.selectorLabel}>Color</Text>
              <Text style={styles.selectorValue}>{colorInfo.name}</Text>
            </View>
            <Text style={styles.changeIcon}>▾</Text>
          </TouchableOpacity>

          {/* Size Selection */}
          <TouchableOpacity
            style={[styles.selector, styles.sizeSelector]}
            onPress={() => setShowSizePicker(true)}>
            <View style={styles.sizePreview}>
              <Text style={styles.sizePreviewText}>{sizeInfo.name}</Text>
            </View>
            <View style={styles.selectorInfo}>
              <Text style={styles.selectorLabel}>Size</Text>
              <Text style={styles.selectorValue}>{sizeInfo.label}</Text>
            </View>
            <Text style={styles.changeIcon}>▾</Text>
          </TouchableOpacity>
        </View>

        {/* Price Selection */}
        <View style={styles.priceSelection}>
          <TouchableOpacity
            style={[
              styles.priceBtn,
              selectedPrice === 'sell_price1' && styles.priceBtnActive,
            ]}
            onPress={() => onChangePrice && onChangePrice('sell_price1')}>
            <Text
              style={[
                styles.priceBtnText,
                selectedPrice === 'sell_price1' && styles.priceBtnTextActive,
              ]}>
              Rs.{product.sell_price1}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.priceBtn,
              selectedPrice === 'sell_price2' && styles.priceBtnActive,
            ]}
            onPress={() => onChangePrice && onChangePrice('sell_price2')}>
            <Text
              style={[
                styles.priceBtnText,
                selectedPrice === 'sell_price2' && styles.priceBtnTextActive,
              ]}>
              Rs.{product.sell_price2}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.priceBtn,
              selectedPrice === 'sell_price3' && styles.priceBtnActive,
            ]}
            onPress={() => onChangePrice && onChangePrice('sell_price3')}>
            <Text
              style={[
                styles.priceBtnText,
                selectedPrice === 'sell_price3' && styles.priceBtnTextActive,
              ]}>
              Rs.{product.sell_price3}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Right Section - Quantity & Subtotal */}
      <View style={styles.rightSection}>
        {/* Quantity Controls */}
        <View style={styles.quantityContainer}>
          <TouchableOpacity style={styles.qtyBtn} onPress={onDecrement}>
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>

          <View style={styles.qtyDisplay}>
            <Text style={styles.qtyText}>{quantity}</Text>
          </View>

          <TouchableOpacity style={styles.qtyBtn} onPress={onIncrement}>
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Subtotal */}
        <Text style={styles.subtotal}>
          Rs. {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </Text>

        {/* Remove Button */}
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Text style={styles.removeBtnText}>✕ Remove</Text>
        </TouchableOpacity>
      </View>

      {/* Color Picker Modal */}
      <ColorPicker
        visible={showColorPicker}
        selectedColor={selectedColor}
        onSelect={(colorId) => onChangeColor && onChangeColor(colorId)}
        onClose={() => setShowColorPicker(false)}
      />

      {/* Size Picker Modal */}
      <SizePicker
        visible={showSizePicker}
        selectedSize={selectedSize}
        sizeType={sizeType}
        onSelect={(sizeId) => onChangeSize && onChangeSize(sizeId)}
        onClose={() => setShowSizePicker(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  detailChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailText: {
    fontSize: 11,
    color: '#666',
    textTransform: 'capitalize',
  },
  // Selectors Row (Color & Size)
  selectorsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  selector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  colorSelector: {
    // Additional styles for color selector if needed
  },
  sizeSelector: {
    // Additional styles for size selector if needed
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  colorPreviewBorder: {
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sizePreview: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sizePreviewText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  selectorInfo: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 1,
  },
  selectorValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  changeIcon: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  // Price Selection
  priceSelection: {
    flexDirection: 'row',
    gap: 6,
  },
  priceBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  priceBtnActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  priceBtnText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
  },
  priceBtnTextActive: {
    color: '#fff',
  },
  // Right Section
  rightSection: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  qtyDisplay: {
    minWidth: 40,
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  removeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeBtnText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '500',
  },
});

export default ProductItem;