import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';

const AllProductCard = ({product, onPress}) => {
  const BASE_URL = 'https://redchilli.lk/'; // Replace with your base URL

  const getStatusColor = (status) => {
    return status === 1 ? '#4CAF50' : '#FF5722';
  };

  const getStatusText = (status) => {
    return status === 1 ? 'Active' : 'Inactive';
  };

  const formatPrice = (price) => {
    const numPrice = parseFloat(price) || 0;
    return `Rs. ${numPrice.toFixed(2)}`;
  };

  const getImageUrl = (src) => {
    if (!src) return null;
    if (src.startsWith('http')) return src;
    return `${BASE_URL}${src}`;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Product Image */}
      <View style={styles.imageContainer}>
        {product.src ? (
          <Image
            source={{uri: getImageUrl(product.src)}}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>📦</Text>
          </View>
        )}
        
        {/* Status Badge */}
        <View style={[styles.statusBadge, {backgroundColor: getStatusColor(product.status)}]}>
          <Text style={styles.statusText}>{getStatusText(product.status)}</Text>
        </View>

        {/* Featured Badge */}
        {product.featured === 1 && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>⭐ Featured</Text>
          </View>
        )}

        {/* New Arrival Badge */}
        {product.new_arrival === 1 && (
          <View style={styles.newBadge}>
            <Text style={styles.newText}>NEW</Text>
          </View>
        )}
      </View>

      {/* Product Details */}
      <View style={styles.detailsContainer}>
        {/* Product Name & Code */}
        <View style={styles.headerRow}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.product_name || 'Unnamed Product'}
          </Text>
        </View>

        <Text style={styles.productCode}>{product.product_code || 'N/A'}</Text>

        {/* Price Section */}
        <View style={styles.priceContainer}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Selling:</Text>
            <Text style={styles.sellingPrice}>
              {formatPrice(product.selling_price)}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Unit:</Text>
            <Text style={styles.unitPrice}>
              {formatPrice(product.unit_price)}
            </Text>
          </View>
        </View>

        {/* Additional Info */}
        <View style={styles.infoRow}>
          {product.gender && (
            <View style={styles.infoBadge}>
              <Text style={styles.infoText}>
                {product.gender === 'Male' ? '👨' : product.gender === 'Female' ? '👩' : '👤'} {product.gender}
              </Text>
            </View>
          )}
          
          {product.brand_id && (
            <View style={styles.infoBadge}>
              <Text style={styles.infoText}>Brand: {product.brand_id}</Text>
            </View>
          )}

          {product.weight && parseFloat(product.weight) > 0 && (
            <View style={styles.infoBadge}>
              <Text style={styles.infoText}>
                {product.weight} {product.weight_unit || 'kg'}
              </Text>
            </View>
          )}
        </View>

        {/* Availability Icons */}
        <View style={styles.availabilityRow}>
          {product.cod_available === 1 && (
            <View style={styles.availabilityBadge}>
              <Text style={styles.availabilityText}>💵 COD</Text>
            </View>
          )}
          {product.return_accepted_available === 1 && (
            <View style={styles.availabilityBadge}>
              <Text style={styles.availabilityText}>↩️ Returns</Text>
            </View>
          )}
          {product.warrenty_available === 1 && (
            <View style={styles.availabilityBadge}>
              <Text style={styles.availabilityText}>🛡️ Warranty</Text>
            </View>
          )}
        </View>
      </View>

      {/* Arrow Icon */}
      <View style={styles.arrowContainer}>
        <Text style={styles.arrowIcon}>›</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: 100,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  placeholderText: {
    fontSize: 36,
  },
  statusBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  featuredBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredText: {
    fontSize: 9,
    color: '#333',
    fontWeight: '600',
  },
  newBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '700',
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  productCode: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 2,
  },
  priceContainer: {
    marginTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    width: 55,
  },
  sellingPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  unitPrice: {
    fontSize: 13,
    color: '#666',
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 6,
  },
  infoBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  infoText: {
    fontSize: 11,
    color: '#666',
  },
  availabilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 6,
  },
  availabilityBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  availabilityText: {
    fontSize: 10,
    color: '#1976D2',
  },
  arrowContainer: {
    justifyContent: 'center',
    paddingLeft: 8,
  },
  arrowIcon: {
    fontSize: 24,
    color: '#ccc',
    fontWeight: '300',
  },
});

export default AllProductCard;