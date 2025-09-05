import { Camera, CameraView } from 'expo-camera';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View, ScrollView, TouchableOpacity } from 'react-native';

export default function App() {

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      console.log('Permission status: ', status);
      setHasPermission(status === "granted");
    })();
  }, []);

  type Item = {
    id: string; // UPC code
    price: string;
    quantity: string;
  };

  const [scannedItems, setScannedItems] = useState<Item[]>([]);
  const [scanned, setScanned] = useState(false); // To prevent double-scanning.

  const handleBarCodeScanned = ({type, data}: {type: string; data: string}) => {
    console.log(`Barcode scanned: ${data}`);
    setScanned(true); // Stop scanning immediately
    
    // Add new item if not already in the list using callback to get latest state
    setScannedItems(prev => {
      if (prev.find(item => item.id === data)) {
        return prev; // Item already exists, don't add
      }
      return [...prev, { id: data, price: '', quantity: '1' }];
    });
  };

  // helper function, to update price or quantity for a given UPC
  const updateItem = (id: string, field: "price" | "quantity", value: string | number) => {
    setScannedItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };
  
  // calculate running total, total automatically recalculates 
  // whenever an item's price or quantity changes.
  const total = scannedItems.reduce(
    (sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0), 0
  );
  
  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>

      {/* CAMERA SECTION */}
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={styles.camera}
        ratio="16:9"
        facing="back"
      >
        {/* Rectangle aim on camera */}
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
        </View>
      </CameraView>

      {/* TOTAL PRICE AMOUNT */}
      <Text style={styles.total}>
        Total: ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </Text>
      
      {/* SCANNED ITEMS LIST */}
      <ScrollView style={styles.itemsList}>
        {scannedItems.length === 0 ? (
          <Text style={styles.emptyMessage}>No items scanned yet. Scan a barcode to get started!</Text>
        ) : (
          scannedItems.slice().reverse().map(item => (
            // Main View container of an item
            <View key={item.id} style={styles.item}>

              {/* UPC TEXT */}
              <Text style={styles.upc}>UPC: {item.id}</Text>

              {/* PRICE ROW */}
              <View style={styles.inputRow}>
                <Text style={styles.label}>Price:</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={item.price}
                  onChangeText={val => {
                    // Allow valid price format: digits, commas, and up to 2 decimal places
                    if (/^\d{1,3}(,\d{3})*(\.\d{0,2})?$|^\d+(\.\d{0,2})?$|^$/.test(val)) {
                      updateItem(item.id, "price", val);
                    }
                  }}
                />
              </View>
              
              {/* QUANTITY ROW */}
              <View style={styles.inputRow}>
                <Text style={styles.label}>Quantity:</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="1"
                  keyboardType="numeric"
                  value={item.quantity}
                  onChangeText={val =>
                    updateItem(item.id, "quantity", val)
                  }
                />
              </View>

            </View>
          ))
        )}
      </ScrollView>

      {/* ACTION BUTTONS */}
      <View>
        <ScrollView horizontal style={styles.actionButtons} showsHorizontalScrollIndicator={false}>

          {/* <TouchableOpacity style={styles.actionButton} onPress={() => setScannedItems([])}>
            <Text style={styles.actionButtonText}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setScannedItems([])}>
            <Text style={styles.actionButtonText}>Clear All</Text>
          </TouchableOpacity> */}

          {/* CLEAR ALL BUTTON */}
          <TouchableOpacity style={styles.actionButton} onPress={() => setScannedItems([])}>
            <Text style={styles.actionButtonText}>Clear All</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* TOTAL PRICE AMOUNT */}
      <Text style={styles.total}>Total: ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
      
      {/* BUTTON TO SCAN ANOTHER ITEM */}
      <TouchableOpacity style={styles.buttonContainer} onPress={() => setScanned(false)}>
        <Text style={styles.buttonText}>scan another item</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({

  // Main container
  container: {
    flex: 1,
    backgroundColor: '#486493ff',
    // alignItems: 'center',
    // justifyContent: 'center',
  },

  // Camera container
  camera: {
    flex: 1
  },

  // Item container
  item: { 
    padding: 16, 
    marginHorizontal: 12,
    marginVertical: 6,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Items List container
  itemsList: {
    maxHeight: 380,
    height: 380,
    backgroundColor: '#f8f9fa',
    paddingTop: 8,
  },

  // UPC container
  upc: { 
    fontSize: 18, 
    fontWeight: "700",
    color: '#2c3e50',
    marginBottom: 8,
  },

  // Text Input container
  input: {
    borderWidth: 1,
    borderColor: "#e1e5e9",
    backgroundColor: '#f8f9fa',
    padding: 12,
    marginVertical: 4,
    width: 100,
    borderRadius: 8,
    fontSize: 16,
  },

  // Total Price amount container
  total: { 
    fontSize: 24, 
    fontWeight: "800", 
    margin: 16,
    color: 'white',
    textAlign: 'center',
  },

  // Rectangle scan area
  overlay: {
    // position: 'absolute',
    // top: 0,
    // left: 0,
    // right: 0,
    // bottom: 0,
    // backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanArea: {
    // position: 'absolute',
    // top: 50,
    // left: '20%',
    // width: '60%',
    // height: 87,
    // backgroundColor: 'transparent',
    // borderWidth: 2,
    // borderColor: 'white',
  },

  // TouchableOpacity button container (SCAN ANOTHER ITEM button)
  buttonContainer: {
    marginBottom: 40,
    marginHorizontal: 20,
    elevation: 8,
    backgroundColor: "#009688",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#009688',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Input Row Container
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    width: 80,
    marginRight: 12,
    color: '#495057',
  },

  // Horizontal Action Buttons section container
  actionButtons: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    // height: 40,
  },
  actionButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // When there are no items (empty list) container
  emptyMessage: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 40,
    paddingHorizontal: 20,
  },

});

// https://medium.com/@sanchit0496/how-to-integrate-camera-in-react-native-application-ae5bd501d9cd