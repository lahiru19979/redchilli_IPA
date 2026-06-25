// components/AllInventoryCard.js
import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

const AllInventoryCard = ({inventory, onPress}) => {
  // Get stock status based on count
  const getStockStatus = (count) => {
    if (count <= 0) {
      return {label: 'Out of Stock', color: '#DC3545', bgColor: '#FFEBEE'};
    } else if (count <= 5) {
      return {label: 'Low Stock', color: '#FF9800', bgColor: '#FFF3E0'};
    } else {
      return {label: 'In Stock', color: '#28A745', bgColor: '#E8F5E9'};
    }
  };

  // Get color for size badge
  const getSizeColor = (size) => {
    const sizes = {
      'XS': '#9C27B0',
      'S': '#2196F3',
      'M': '#4CAF50',
      'L': '#FF9800',
      'XL': '#F44336',
      'XXL': '#795548',
      'XXXL': '#607D8B',
    };
    return sizes[size?.toUpperCase()] || '#007AFF';
  };

  const stockStatus = getStockStatus(inventory.count);
  const sizeColor = getSizeColor(inventory.size_se);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* Header - Item Code & Stock Status */}
      <View style={styles.header}>
        <View style={styles.codeContainer}>
          <Text style={styles.itemCode}>{inventory.itemcode_td}</Text>
        </View>
        <View style={[styles.statusBadge, {backgroundColor: stockStatus.bgColor}]}>
          <Text style={[styles.statusText, {color: stockStatus.color}]}>
            {stockStatus.label}
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>
        {inventory.desc_td}
      </Text>

      {/* Color & Size Row */}
      <View style={styles.attributesRow}>
        {/* Color */}
        <View style={styles.attributeItem}>
          <Text style={styles.attributeLabel}>Color</Text>
          <View style={styles.colorContainer}>
            <View 
              style={[
                styles.colorDot, 
                {backgroundColor: getColorCode(inventory.colortable)}
              ]} 
            />
            <Text style={styles.colorName}>{inventory.colortable || 'N/A'}</Text>
          </View>
        </View>

        {/* Size */}
        <View style={styles.attributeItem}>
          <Text style={styles.attributeLabel}>Size</Text>
          <View style={[styles.sizeBadge, {backgroundColor: sizeColor}]}>
            <Text style={styles.sizeText}>{inventory.size_se || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* Footer - Available Quantity */}
      <View style={styles.footer}>
        <View style={styles.quantitySection}>
          <Text style={styles.quantityLabel}>Available Quantity</Text>
          <View style={styles.quantityBox}>
            <Text style={[styles.quantityValue, {color: stockStatus.color}]}>
              {inventory.count}
            </Text>
            <Text style={styles.quantityUnit}>pcs</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Helper function to get approximate color code
const getColorCode = (colorName) => {
  if (!colorName) return '#808080';
  
  const colorMap = {
    // Basic colors
    'white': '#FFFFFF',
    'black': '#000000',
    'red': '#FF0000',
    'blue': '#0000FF',
    'green': '#008000',
    'yellow': '#FFFF00',
    'orange': '#FFA500',
    'pink': '#FFC0CB',
    'purple': '#800080',
    'brown': '#8B4513',
    'gray': '#808080',
    'grey': '#808080',
    'navy': '#000080',
    'beige': '#F5F5DC',
    'cream': '#FFFDD0',
    'maroon': '#800000',
    'olive': '#808000',
    'teal': '#008080',
    'coral': '#FF7F50',
    'gold': '#FFD700',
    'silver': '#C0C0C0',
    
    // Special colors from your data
    'nicky': '#8B7355',
    'mint': '#98FB98',
    'wine red': '#722F37',
    'tify pink': '#FF69B4',
    'wine': '#722F37',
  };

  const lowerName = colorName.toLowerCase();
  
  // Direct match
  if (colorMap[lowerName]) {
    return colorMap[lowerName];
  }
  
  // Partial match
  for (const [key, value] of Object.entries(colorMap)) {
    if (lowerName.includes(key)) {
      return value;
    }
  }
  
  // Default gray for unknown colors
  return '#808080';
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  codeContainer: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  itemCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 14,
    lineHeight: 22,
  },
  attributesRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  attributeItem: {
    flex: 1,
  },
  attributeLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  colorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textTransform: 'capitalize',
  },
  sizeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sizeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 14,
  },
  quantitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityLabel: {
    fontSize: 14,
    color: '#666',
  },
  quantityBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  quantityValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  quantityUnit: {
    fontSize: 14,
    color: '#888',
    marginLeft: 4,
  },
});

export default AllInventoryCard;