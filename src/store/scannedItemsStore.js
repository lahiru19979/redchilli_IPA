// store/scannedItemsStore.js
class ScannedItemsStore {
  constructor() {
    this.items = [];
    this.listeners = [];
  }

  addItem(barcode) {
    const existingItem = this.items.find(item => item.barcode === barcode);
    
    if (existingItem) {
      existingItem.quantity += 1;
      existingItem.lastScanned = new Date().toLocaleTimeString();
    } else {
      this.items.push({
        id: Date.now().toString(),
        barcode: barcode,
        quantity: 1,
        scannedAt: new Date().toLocaleTimeString(),
        lastScanned: new Date().toLocaleTimeString(),
      });
    }
    
    this.notifyListeners();
  }

  // ✅ New method to update quantity
  updateQuantity(id, newQuantity) {
    const item = this.items.find(item => item.id === id);
    if (item) {
      item.quantity = Math.max(1, parseInt(newQuantity) || 1);
      this.notifyListeners();
    }
  }

  // ✅ Increment quantity
  incrementQuantity(id) {
    const item = this.items.find(item => item.id === id);
    if (item) {
      item.quantity += 1;
      this.notifyListeners();
    }
  }

  // ✅ Decrement quantity
  decrementQuantity(id) {
    const item = this.items.find(item => item.id === id);
    if (item && item.quantity > 1) {
      item.quantity -= 1;
      this.notifyListeners();
    }
  }

  getItems() {
    return this.items;
  }

  removeItem(id) {
    this.items = this.items.filter(item => item.id !== id);
    this.notifyListeners();
  }

  clearAll() {
    this.items = [];
    this.notifyListeners();
  }

  getTotalCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  // ✅ Get data for saving
  getDataForSave() {
    return this.items.map(item => ({
      barcode: item.barcode,
      quantity: item.quantity,
      scannedAt: item.scannedAt,
    }));
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.items));
  }
}

const scannedItemsStore = new ScannedItemsStore();
export default scannedItemsStore;