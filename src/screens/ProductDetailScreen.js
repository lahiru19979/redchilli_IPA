import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { C } from '../utils/theme';

const ProductDetailScreen = ({route, navigation}) => {
  const {product} = route.params;
  const BASE_URL = 'https://redchilli.lk/';

  const getImageUrl = (src) => {
    if (!src) return null;
    if (src.startsWith('http')) return src;
    return `${BASE_URL}${src}`;
  };

  const formatPrice = (price) => {
    const numPrice = parseFloat(price) || 0;
    return `Rs. ${numPrice.toFixed(2)}`;
  };

  const images = [
    product.src,
    product.supimg1,
    product.supimg2,
    product.supimg3,
  ].filter(Boolean);

  return (
    <ScrollView style={styles.container}>
      {/* Image Gallery */}
      <ScrollView 
        horizontal 
        pagingEnabled 
        showsHorizontalScrollIndicator={false}
        style={styles.imageGallery}
      >
        {images.map((img, index) => (
          <Image
            key={index}
            source={{uri: getImageUrl(img)}}
            style={styles.productImage}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      {/* Product Info */}
      <View style={styles.infoContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.productCode}>{product.product_code}</Text>
          <View style={[
            styles.statusBadge, 
            {backgroundColor: product.status === 1 ? C.success : C.warning}
          ]}>
            <Text style={styles.statusText}>
              {product.status === 1 ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <Text style={styles.productName}>{product.product_name}</Text>

        {/* Prices */}
        <View style={styles.priceSection}>
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Unit Price</Text>
            <Text style={styles.priceValue}>{formatPrice(product.unit_price)}</Text>
          </View>
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Selling Price</Text>
            <Text style={[styles.priceValue, styles.sellingPrice]}>
              {formatPrice(product.selling_price)}
            </Text>
          </View>
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Dealer Price</Text>
            <Text style={styles.priceValue}>{formatPrice(product.dealer_price)}</Text>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gender</Text>
            <Text style={styles.detailValue}>{product.gender || 'N/A'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Brand ID</Text>
            <Text style={styles.detailValue}>{product.brand_id || 'N/A'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Weight</Text>
            <Text style={styles.detailValue}>
              {product.weight} {product.weight_unit}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Dimensions (L×W×H)</Text>
            <Text style={styles.detailValue}>
              {product.length} × {product.width} × {product.height}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Origin ZIP</Text>
            <Text style={styles.detailValue}>{product.origin_zip_code || 'N/A'}</Text>
          </View>
        </View>

        {/* Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <View style={styles.badgesRow}>
            <View style={[
              styles.availBadge, 
              {backgroundColor: product.cod_available ? C.successLight : C.dangerLight}
            ]}>
              <Text style={styles.availText}>
                {product.cod_available ? '✅' : '❌'} COD
              </Text>
            </View>
            <View style={[
              styles.availBadge, 
              {backgroundColor: product.return_accepted_available ? C.successLight : C.dangerLight}
            ]}>
              <Text style={styles.availText}>
                {product.return_accepted_available ? '✅' : '❌'} Returns
              </Text>
            </View>
            <View style={[
              styles.availBadge, 
              {backgroundColor: product.warrenty_available ? C.successLight : C.dangerLight}
            ]}>
              <Text style={styles.availText}>
                {product.warrenty_available ? '✅' : '❌'} Warranty
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        {product.product_description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.product_description}</Text>
          </View>
        )}

        {/* Timestamps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timestamps</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValue}>{product.created_at}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Updated</Text>
            <Text style={styles.detailValue}>{product.updated_at}</Text>
          </View>
        </View>
      </View>

      {/* Edit Button */}
      <TouchableOpacity 
        style={styles.editButton}
        onPress={() => navigation.navigate('EditProduct', {product})}
      >
        <Text style={styles.editButtonText}>Edit Product</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  imageGallery: {
    height: 300,
    backgroundColor: C.surface,
  },
  productImage: {
    width: 400,
    height: 300,
  },
  infoContainer: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productCode: {
    fontSize: 14,
    color: C.accent,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: C.surface,
    fontWeight: '600',
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    color: C.textPrimary,
    marginTop: 8,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  priceCard: {
    flex: 1,
    backgroundColor: C.surface,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 11,
    color: C.textSecondary,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
  },
  sellingPrice: {
    color: C.success,
    fontSize: 16,
  },
  section: {
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  detailLabel: {
    fontSize: 14,
    color: C.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  availBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  availText: {
    fontSize: 13,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 22,
  },
  editButton: {
    backgroundColor: C.accent,
    marginHorizontal: 16,
    marginVertical: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: C.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProductDetailScreen;