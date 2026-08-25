import {StyleSheet} from 'react-native';
import {C} from '../../utils/theme';

const styles = StyleSheet.create({
  bottomSpacer: {
    height: 20,
  },
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    flex: 1,
  },
  // Invoice Number Section
  invoiceNoSection: {
    backgroundColor: C.accent,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceNoLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  invoiceNoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.surface,
    marginTop: 2,
  },
  invoiceDateContainer: {
    alignItems: 'flex-end',
  },
  invoiceDateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: C.surface,
    marginTop: 2,
  },
  // Section
  section: {
    backgroundColor: C.surface,
    marginTop: 12,
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.textPrimary,
  },
  clearCustomerText: {
    fontSize: 14,
    color: C.danger,
    fontWeight: '500',
  },
  // Customer ID Badge
  customerIdBadge: {
    backgroundColor: C.accentLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  customerIdText: {
    fontSize: 14,
    color: C.accent,
    fontWeight: '600',
  },
  // Input
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textSecondary,
    marginBottom: 8,
  },
  // Phone Selector
  phoneSelector: {
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phoneSelectorText: {
    fontSize: 16,
    color: C.textPrimary,
  },
  phoneSelectorPlaceholder: {
    color: C.textSecondary,
  },
  phoneSelectorArrow: {
    fontSize: 12,
    color: C.textSecondary,
  },
  // Readonly Field
  readonlyField: {
    backgroundColor: C.divider,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  readonlyFieldMultiline: {
    minHeight: 70,
  },
  readonlyText: {
    fontSize: 16,
    color: C.textPrimary,
  },
  // Customer Type
  typeSelector: {
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  typeSelectorText: {
    fontSize: 16,
    color: C.textPrimary,
  },
  typeSelectorArrow: {
    fontSize: 12,
    color: C.textSecondary,
  },
  typeDropdown: {
    backgroundColor: C.surface,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.border,
    elevation: 3,
  },
  typeDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  typeDropdownItemActive: {
    backgroundColor: C.accentLight,
  },
  typeDropdownItemText: {
    flex: 1,
    fontSize: 16,
    color: C.textPrimary,
  },
  typeDropdownItemTextActive: {
    fontWeight: '600',
    color: C.accent,
  },
  typeCheckmark: {
    fontSize: 16,
    color: C.accent,
    fontWeight: 'bold',
  },
  // Add Buttons
  addButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    backgroundColor: C.success,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: C.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  scanButton: {
    backgroundColor: C.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scanButtonText: {
    color: C.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  // Empty Products
  emptyProducts: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: C.textSecondary,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: C.textSecondary,
    marginTop: 4,
  },
  // Summary Card
  summaryCard: {
    backgroundColor: C.surface,
    marginTop: 12,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  summaryRowTotal: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: C.divider,
  },
  summaryLabel: {
    fontSize: 14,
    color: C.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
  },
  summaryLabelTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textPrimary,
  },
  summaryValueTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.success,
  },
  // Clear Cart
  clearCartButton: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.dangerLight,
  },
  clearCartButtonText: {
    fontSize: 14,
    color: C.danger,
    fontWeight: '500',
  },
  // Bottom Section
  bottomSection: {
    backgroundColor: C.surface,
    padding: 16,
    // Overridden at runtime with the device's real inset; this is the floor for
    // a phone that reports none.
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textPrimary,
  },
  totalQty: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 2,
  },
  totalAmount: {
    fontSize: 26,
    fontWeight: 'bold',
    color: C.success,
  },
  createButton: {
    backgroundColor: C.accent,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: C.textPlaceholder,
  },
  createButtonText: {
    color: C.surface,
    fontSize: 18,
    fontWeight: '700',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  // Phone Modal
  phoneModal: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  phoneModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  newCustomerBtn: {
    marginLeft: 'auto',
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: C.success,
  },
  newCustomerBtnText: {color: '#fff', fontWeight: '700', fontSize: 12.5},
  newCustomerCta: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.accent,
  },
  newCustomerCtaText: {color: C.accent, fontWeight: '700', fontSize: 13},
  newCustomerBody: {padding: 16},
  newCustomerLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: C.textSecondary,
    marginBottom: 4,
    marginTop: 10,
  },
  newCustomerInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14.5,
    color: C.textPrimary,
    backgroundColor: C.surface,
  },
  newCustomerInputTall: {minHeight: 76, textAlignVertical: 'top'},
  newCustomerHint: {
    fontSize: 11.5,
    color: C.textSecondary,
    marginTop: 10,
  },
  newCustomerSave: {
    marginTop: 16,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: C.success,
  },
  newCustomerSaveOff: {opacity: 0.6},
  newCustomerSaveText: {color: '#fff', fontWeight: '700', fontSize: 14.5},
  phoneModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.textPrimary,
  },
  phoneModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneModalCloseText: {
    fontSize: 18,
    color: C.textSecondary,
  },
  phoneSearchContainer: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneSearchInput: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: C.border,
    color: C.textPrimary,
  },
  phoneSearchClear: {
    position: 'absolute',
    right: 28,
    padding: 8,
  },
  phoneSearchClearText: {
    fontSize: 16,
    color: C.textSecondary,
  },
  // Customer List
  customerList: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  customerItemSelected: {
    borderColor: C.accent,
    backgroundColor: C.accentLight,
  },
  customerItemLeft: {
    marginRight: 14,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.surface,
  },
  customerItemContent: {
    flex: 1,
  },
  customerItemCusId: {
    fontSize: 11,
    color: C.accent,
    fontWeight: '600',
  },
  customerItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textPrimary,
  },
  customerItemPhone: {
    fontSize: 14,
    color: C.textSecondary,
  },
  customerItemAddress: {
    fontSize: 12,
    color: C.textSecondary,
  },
  customerItemCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerItemCheckText: {
    fontSize: 16,
    color: C.surface,
    fontWeight: 'bold',
  },
  // Preview Modal
  previewModal: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 0,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: C.textPrimary,
  },
  previewClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseText: {
    fontSize: 18,
    color: C.textSecondary,
  },
  previewSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  previewInvoiceNo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewInvoiceNoLabel: {
    fontSize: 14,
    color: C.textSecondary,
    marginRight: 8,
  },
  previewInvoiceNoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.accent,
  },
  previewDate: {
    fontSize: 14,
    color: C.textSecondary,
  },
  previewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 12,
  },
  previewInfoRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  previewInfoLabel: {
    width: 80,
    fontSize: 14,
    color: C.textSecondary,
  },
  previewInfoValue: {
    flex: 1,
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: '500',
  },
  previewTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewTypeBadgeText: {
    fontSize: 12,
    color: C.surface,
    fontWeight: '600',
  },
  previewItem: {
    backgroundColor: C.bg,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  previewItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewItemNo: {
    fontSize: 12,
    color: C.textSecondary,
    marginRight: 8,
  },
  previewItemCode: {
    fontSize: 12,
    color: C.accent,
    fontWeight: '600',
  },
  previewItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 6,
  },
  previewItemDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  previewItemDetail: {
    fontSize: 12,
    color: C.textSecondary,
  },
  previewItemColorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewItemColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 6,
  },
  previewItemPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  previewItemQty: {
    fontSize: 13,
    color: C.textSecondary,
  },
  previewItemPrice: {
    fontSize: 13,
    color: C.textSecondary,
  },
  previewItemTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: C.success,
  },
  previewSummary: {
    padding: 16,
    backgroundColor: C.accentLight,
  },
  previewSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  previewSummaryTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: C.accent,
  },
  previewSummaryLabel: {
    fontSize: 14,
    color: C.textSecondary,
  },
  previewSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
  },
  previewSummaryLabelTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: C.textPrimary,
  },
  previewSummaryValueTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: C.accent,
  },
  previewActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  previewCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
  },
  previewCancelButtonText: {
    fontSize: 16,
    color: C.textSecondary,
    fontWeight: '600',
  },
  previewConfirmButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: C.success,
    alignItems: 'center',
  },
  previewConfirmButtonText: {
    fontSize: 16,
    color: C.surface,
    fontWeight: '700',
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: C.textSecondary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: C.surface,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
  },
  loadingBoxText: {
    marginTop: 16,
    fontSize: 16,
    color: C.textPrimary,
    fontWeight: '500',
  },
  // No Results
  noResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noResultsText: {
    fontSize: 16,
    color: C.textSecondary,
  },
  // Product Modal
  modalContainer: {
    flex: 1,
    backgroundColor: C.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.textPrimary,
  },
  modalCloseText: {
    fontSize: 24,
    color: C.textSecondary,
  },
  modalSearchContainer: {
    padding: 16,
  },
  modalSearchInput: {
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: C.border,
    color: C.textPrimary,
  },
  searchProductsList: {
    padding: 16,
    paddingTop: 0,
  },
  searchProductItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.bg,
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  searchProductInfo: {
    flex: 1,
  },
  searchProductCode: {
    fontSize: 12,
    color: C.accent,
    fontWeight: '600',
  },
  searchProductName: {
    fontSize: 16,
    color: C.textPrimary,
    fontWeight: '500',
    marginTop: 2,
  },
  searchProductDetails: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 4,
  },
  searchProductPrices: {
    alignItems: 'flex-end',
  },
  searchProductPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: C.success,
  },
});

export default styles;
