import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';

// Matches BASE_URL in your apiClient.js — image paths append directly
const BASE_URL = 'https://redchilli.lk/';

const getStatusInfo = status => {
  switch (status) {
    case 1:
      return {label: 'Active', color: '#2E7D32'};
    case 0:
    default:
      return {label: 'Inactive', color: '#B0BEC5'};
  }
};

const ProductCard = ({product, onPress}) => {
  const statusInfo = getStatusInfo(product.status);
  const [imgError, setImgError] = useState(false);

  // product.src = "images/uploads/product/image_438_xxx.png"
  const imageUri = product.src ? `${BASE_URL}${product.src}` : null;

  // Strip HTML tags from short_description
  const plainDesc = product.short_description
    ? product.short_description.replace(/<[^>]+>/g, '').trim()
    : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>

      {/* Product Image */}
      <View style={styles.imageContainer}>
        {imageUri && !imgError ? (
          <Image
            source={{uri: imageUri}}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderIcon}>🖼️</Text>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        {/* Status badge — top right */}
        <View style={[styles.statusBadge, {backgroundColor: statusInfo.color}]}>
          <Text style={styles.statusText}>{statusInfo.label}</Text>
        </View>

        {/* Gift badge — top left */}
        {product.is_gift === 1 && (
          <View style={styles.giftBadge}>
            <Text style={styles.giftText}>🎁 Gift</Text>
          </View>
        )}

        {/* New Arrival badge — bottom left */}
        {product.new_arrival === 1 && (
          <View style={styles.newBadge}>
            <Text style={styles.newText}>NEW</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.product_name}
        </Text>
        <Text style={styles.productCode}>{product.product_code}</Text>

        {plainDesc ? (
          <Text style={styles.shortDesc} numberOfLines={2}>
            {plainDesc}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          {product.gender ? (
            <Text style={styles.metaChip}>👤 {product.gender}</Text>
          ) : null}
          {product.weight ? (
            <Text style={styles.metaChip}>
              ⚖️ {product.weight} {product.weight_unit}
            </Text>
          ) : null}
          {product.return_accepted_available === 1 ? (
            <Text style={styles.metaChip}>↩️ Returns</Text>
          ) : null}
          {product.cod_available === 1 ? (
            <Text style={[styles.metaChip, styles.codChip]}>💵 COD</Text>
          ) : null}
        </View>
      </View>

      {/* Footer — same layout as InvoiceCard */}
      <View style={styles.footer}>
        <Text style={styles.typeLabel}>
          {product.search_tags
            ? product.search_tags.split(',')[0].trim()
            : 'Product'}
        </Text>
        <Text style={styles.amount}>
          {parseFloat(product.selling_price) > 0
            ? `Rs. ${product.selling_price}`
            : 'Price TBD'}
        </Text>
      </View>

    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 0,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },

  // Image
  imageContainer: {
    width: '100%',
    height: 190,
    backgroundColor: '#ECEFF1',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
  },
  placeholderText: {
    fontSize: 12,
    color: '#90A4AE',
    marginTop: 4,
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  giftBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#E91E63',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  giftText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  newBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#FF6F00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // Body
  body: {
    padding: 16,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productCode: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 6,
    fontWeight: '500',
  },
  shortDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  metaChip: {
    fontSize: 12,
    color: '#555',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  codChip: {
    backgroundColor: '#FFF8E1',
    color: '#F57F17',
  },

  // Footer — identical structure to InvoiceCard footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  typeLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'capitalize',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
});

export default ProductCard;
