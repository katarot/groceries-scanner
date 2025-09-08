import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

// Item object type
type Item = {
  id: string;
  type: string;
  name: string;
  price: string;
  quantity: string;
};

// Item Screen Properties interface type that contains:
// A list of the scanned items,
// A function to set the
interface ItemsScreenProps {
  scannedItems: Item[];
  setScannedItems: (items: Item[]) => void;
  onSaveReceipt: () => void;
}

// Items Screen screen function
export default function ItemsScreen({ scannedItems, setScannedItems, onSaveReceipt }: ItemsScreenProps) {

  // Set total of the scanned items based on the item price and quantity.
  const total = scannedItems.reduce(
    (sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0), 0
  );

  return (
    <View style={styles.container}>
      
      {/* TITLE */}
      <Text style={styles.header}>Current Items</Text>

      {/* ITEMS LIST */}
      <ScrollView style={styles.itemsList}>
        {scannedItems.length === 0 ? (
          <Text style={styles.emptyMessage}>No items in your cart yet.</Text>
        ) : (
          scannedItems.slice().reverse().map(item => (
            // ITEM VIEW
            <View key={item.id} style={styles.item}>
              
              {/* UPC LABEL */}
              <Text style={styles.upc}>{item.type.toUpperCase()}: {item.id}</Text>

              {/* PRICE AND QUANTITY DETAILS */}
              <Text style={styles.details}>
                Price: ${parseFloat(item.price) || 0} × {parseInt(item.quantity) || 0} = ${((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0)).toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
      
      {/* TOTAL DISPLAY */}
      <Text style={styles.total}>Total: ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
      {scannedItems.length > 0 && (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.clearButton} onPress={() => setScannedItems([])}>
            <Text style={styles.buttonText}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={onSaveReceipt}>
            <Text style={styles.buttonText}>Save Receipt</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  // Header (title) container
  header: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    margin: 20,
    marginVertical: 10,
    color: '#2c3e50',
    marginTop: 60
  },

  // Items List container
  itemsList: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Item container
  item: {
    // borderWidth: 1,
    // height: 120,
    padding: 16,
    marginVertical: 6,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  upc: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  details: {
    fontSize: 14,
    color: '#495057',
  },
  total: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    margin: 16,
    color: '#2c3e50',
  },
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#009688',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyMessage: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 40,
  },
});