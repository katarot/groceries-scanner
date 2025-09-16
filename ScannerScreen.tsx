import { Camera, CameraView } from 'expo-camera'; // expo-camera doesn't work properly on web - it's designed for native app
// import { Camera, useCameraDevices, useCodeScanner, getCameraDevice, CodeScanner } from 'react-native-vision-camera';
import { useEffect, useState, useRef } from 'react';
import { Alert, Platform, SafeAreaView, StyleSheet, Text, TextInput, View, ScrollView, TouchableOpacity } from 'react-native';
import WebBarcodeScanner from './WebBarcodeScanner';
import Tesseract from 'tesseract.js';

// Item object type 
type Item = {
  id: string;
  type: string;
  name: string;
  price: string;
  quantity: string;
  scanSource: string; 
};

// Scanner screen properties interface
interface ScannerScreenProps {
  scannedItems: Item[];
  setScannedItems: (items: Item[]) => void;
}


 /* ************************* *
  * |SCANNER SCREEN FUNCTION| *
  * ************************* */
export default function ScannerScreen({ scannedItems, setScannedItems }: ScannerScreenProps) {
  
  console.log('ScannerScreen re-rendering.');

  /* ****************** *
   * |INIT STATE HOOKS| *
   * ****************** */

  // Has permission state hook 
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Scanned status state hook 
  const [scanned, setScanned] = useState(false);

  // Price detection (OCR) state hook 
  const [detectedPrice, setDetectedPrice] = useState<string | null>(null);

  // Item counter for unique IDs and names state hook
  const [itemCounter, setItemCounter] = useState(1);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // 
  const captureRef = useRef<(() => void) | null>(null);

  // State for manual scanning mode - enable manual scanning.
  const [manualScanMode, setManualScanMode] = useState(true);
  
  // Track what to scan for state hook
  const [scanType, setScanType] = useState<'barcode' | 'price' | null>(null);
  

  /* ****************************** *
   * | useEffect STATE HOOK       | *
   * | PERFORM ACTIONS AFTER      | *
   * | THE COMPONENT RENDERS      | *
   * | OR IN RESPONSE TO SPECIFIC | *
   * | CHANGES IN STATE OR PROPS. | *
   * ------------------------------ *
   *  Init scan type                *
   *  Set permission                *
  * ****************************** */
  useEffect(() => {
    (async () => {
      
      console.log(`ScannerScreen - useEffect - async - Platform.OS: ${Platform.OS}`);

      // Init scan type to null
      setScanType(null);
      
      // Asks the user to grant permissions for accessing camera, 
      // then set permission state value –hasPermission– to true by using (status === 'granted').
      if (Platform.OS === 'web') {
        /* 
          For web, handle permission in WebBarcodeScanner component. 
          The WebBarcodeScanner component will handle its own camera permissions 
          when it tries to access navigator.mediaDevices. 
          If the user denies camera access in the browser, the WebBarcodeScanner will 
          catch it as an error and log it.
          Web: Always proceed to show WebBarcodeScanner (which handles its own permissions)   */
        console.log("Platform OS is web.\n - Setting permission to true.");
        setHasPermission(true);
        
      } else {
        console.log("Platform OS is not web. It is " + Platform.OS);
        // For native apps, use expo-camera persmissions
        const { status } = await Camera.requestCameraPermissionsAsync();
        console.log(' - Camera.requestCameraPermissionsAsync permission status: ', status);
        setHasPermission(status === "granted"); 
        console.log(" - Set permission status to 'granted'.");
        // Native: Uses expo-camera permission system
      }
      
      // React-native-vision-camera below: 
      // const cameraPermission = await Camera.requestCameraPermission();
      // console.log('Camera permission: ', cameraPermission);
      // setHasPermission(cameraPermission === "granted");

    })();
  }, []);


  /* ******************************** *
   * | FUNCTIONS                    | *
   * +------------------------------+ *
   * |  - scanBarcode               | *
   * +------------------------------+ *
   * |  - handleBarCodeScanned      | *
   * +------------------------------+ *
   * |  - handleCapturedFrame       | *
   * +------------------------------+ *
   * |  - captureAndProcessOCR      | *
   * +------------------------------+ *
   * |  - updateItem                | *
   * +------------------------------+ *
   * |  - handleNamePress           | *
   * +------------------------------+ *
   * |  - handleNameSubmit          | *
   * ******************************** */

  /** [Scan Code btn] => Activates barcode scanning mode */
  const scanBarcode = () => {
    console.log('scanBarcode - setScanType barcode');
    setScanType('barcode');
    setScanned(false);  // Enable scanning temporarily
  };
  
  /** Processes scanned barcode data and adds item to list */
  const handleBarCodeScanned = ({type, data}: {type: string; data: string}) => {
    
    console.log('-------------------------------------');
    console.log(`ScannerScreen: handleBarCodeScanned - scanType: ${scanType}, type: ${type}, data: ${data}`);
    
    // 
    setScanned(true);

    // 
    const newId = `item-${Date.now()}`;
    const newName = `Item ${itemCounter}`;

    setScannedItems(
      [ ...scannedItems.filter(item => item.id !== data), 
        {
          id: newId, 
          // type: type === 'ean13' ? 'UPC' : type === 'qr' ? 'QR' : type, 
          type: type ? type : '-type-', 
          name: newName,
          price: '0.00', 
          quantity: '1', 
          scanSource: data 
        }
      ]);
    
    setItemCounter(itemCounter + 1);
    
    // After 2 seconds, set the scanned state value to false.
    // The scanned boolean state has to be false in order to scan again.
    setTimeout(() => setScanned(false), 2000);  
      
    console.log('ScannerScreen: handleBarCodeScanned - scannedItems:');
    console.log(scannedItems);
    console.log('-------------------------------------');
  
    setScanType(null); // Reset scan type after successful scan.

  };

  /** Processes captured frame for OCR price detection */
  const handleCapturedFrame = async (imageData: string) => {
    try {
      // Only process if we're in OCR scan mode.
      if (scanType !== 'price') return;
      
      const { data: { text } } = await Tesseract.recognize(imageData, 'eng');
      const priceMatch = text.match(/\$?\d+\.\d{2}/);
      
      console.log(' -- priceMatch --');
      console.log(priceMatch);
      
      if (priceMatch) {
        
        const cleanPrice = priceMatch[0].replace(/[^\d.]/g, ''); // Remove $ and non-numeric symbols
        setDetectedPrice(cleanPrice);
        
        const newId = `item-${Date.now()}`;
        const newName = `Item #${itemCounter}`;
        
        setScannedItems([
          ...scannedItems, 
          { id: newId, 
            type: 'PRICE', 
            name: newName, 
            price: cleanPrice, 
            quantity: '1', 
            scanSource: 'Scanned price' }
        ]);
        
        setItemCounter(itemCounter + 1);
      }
    } catch (error) {
      console.error('Tesseract Error:', error);
    } finally {
      setScanType(null); // Reset after processing
    }
  };

  /** Initiates OCR price scanning process */
  const captureAndProcessOCR = async () => {
    setScanType('price');
    setScanned(false);
    try {
      console.log("Platform.OS");
      console.log(Platform.OS);
      // For web platform, we need to pass a ref to get the video element
      if (Platform.OS === 'web' && captureRef.current) {
        captureRef.current(); // This triggers captureFrame which calls handleCapturedFrame
      } else {
        Alert.alert(`App is not running on a web-browser.\nTo detect a price, use a web browser.`);
      }
    } catch (error) {
      console.error('OCR Error', error);
    }
  };
  
  /** Updates item field (price, quantity, or name) in scanned items list */
  const updateItem = (id: string, field: "price" | "quantity" | "name", value: string) => {
    console.log('ScannerScreen: updateItem - id: ' + id);
    console.log('ScannerScreen: updateItem - field: ' + field);
    console.log('ScannerScreen: updateItem - value: ' + value + ', length ' + value.length);
    if (value.length > 15) return;
    setScannedItems(
      scannedItems.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
    console.log(scannedItems);
  };

  /** Enables editing mode for item name */
  const handleNamePress = (itemId: string) => {
    console.log(`onPress -> handleNamePress: ${itemId}`);
    setEditingItemId(itemId);
  };

  /** Exits editing mode for item name */
  const handleNameSubmit = (itemId: string) => {
    console.log(`onSubmitEditing -> handleNameSubmit: ${itemId}`);
    console.log(`onBlur -> handleNameSubmit: ${itemId}`);
    setEditingItemId(null);
  };

  /** Removes item from scanned items list */
  const removeItemFromScannedItems = (id: string) => {
    setScannedItems(scannedItems.filter(item => item.id != id));
  };

  /* ******************* *
   * | CALCULATE TOTAL | *
   * ******************* */

  /** When item's price or quantity changes (on component re-rendering):
      Calculate running total, total automatically recalculates 
        - When scannedItems state changes - whenever items are added, updated, or removed 
        - When any item's price or quantity is modified via the updateItem function 
        - On any other component re-render - for any state change in the component      
      This variable is declared as a regular variable inside the component function body. */
  const total = scannedItems.reduce(
    (sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0), 0
  );
  //  React functional components re-execute their entire function body on every render, 
  //  so this calculation above runs fresh each time.
  // If performance optimization was needed, this could be wrapped in useMemo with scannedItems
  // as a dependency to only recalculate when the items actually change.


  /** CHECK PERMISSIONS */ 
  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }
  if (hasPermission === false) {
    console.log('ScannerScreen: hasPermission - ', hasPermission);
    // return <Text>No access to camera</Text>;
    return (
      <View style={styles.container}>
        <Text style={styles.emptyMessage}>
          Camera access denied. {'\n\n'}
          For mobile: Please install this app by tapping "Add to Home Screen" for better camera access.
          {'\n\n'}
          Or enable camera permissions in your browser settings.
        </Text>
      </View>
    );
  }


  /* ****************** *
   * | USER INTERFACE | *
   * ****************** */
  return (
    <View style={styles.container}>
      
      {/** CAMERA SECTION - WEB and/or NATIVE DEVICE */}
      {Platform.OS === 'web' ? (
        scanType ? (
          <WebBarcodeScanner
            onBarcodeScanned={scanType === 'barcode' ? handleBarCodeScanned : () => {}}
            style={styles.camera}
            facing="back"
            onCaptureFrame={scanType === 'price' ? handleCapturedFrame : () => {}}
            captureRef={captureRef}
          />
        ) : (
          <View style={[styles.camera, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
            <Text style={{ color: 'white', fontSize: 18 }}>Press a scan button to activate camera</Text>
          </View>
        )
      ) : (
        scanType ? (
          <CameraView 
            onBarcodeScanned={handleBarCodeScanned}
            style={styles.camera}
            ratio="16:9"
            facing="back"
          />
        ) : (
          <View style={[styles.camera, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
            <Text style={{ color: 'white', fontSize: 18 }}>Press a scan button to activate camera</Text>
          </View>
        )
      )}
      

      {/** TOTAL PRICE AMOUNT */}
      <Text style={styles.total}>
        Total: ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </Text>


      {/* SCANNED ITEMS LIST */}
      <ScrollView style={styles.itemsList}>
        
        {(() => {
          console.log(`ScannerScreen: ScrollView - Scanned items list: `, scannedItems);
          return null;
        })()}
        
        {scannedItems.length === 0 ? (
          <Text style={styles.emptyMessage}>No items scanned yet. Scan a barcode to get started!</Text>
        ) : (
          scannedItems.slice().reverse().map(item => (
            
            // Main View container of an item
            <View key={item.id} style={styles.item}>

              {/* UPC LABEL, QUANTITY AND PRICE ROW */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>

                {editingItemId === item.id ? (
                  <TextInput
                    style={[styles.upc, { borderBottomWidth: 1, borderBottomColor: '#ccc' }]}
                    value={item.name}
                    onChangeText={val => 
                      updateItem(item.id, "name", val)
                    }
                    onSubmitEditing={() => handleNameSubmit(item.id)}
                    onBlur={() => handleNameSubmit(item.id)}
                    autoFocus
                  />
                ) : (
                  <TouchableOpacity onPress={() => handleNamePress(item.id)}>
                    <Text style={styles.upc}>
                      {item.name || `${item.type.toUpperCase()}: ${item.id}`}
                    </Text>
                  </TouchableOpacity>
                )}
                <Text style={{fontSize: 15, paddingLeft: 10, paddingRight: 10}}>X</Text>
                <TextInput 
                    style={[styles.input, { width: 45 }]}
                    placeholder="1"
                    keyboardType="numeric"
                    value={item.quantity}
                    onChangeText={val =>
                      updateItem(item.id, "quantity", val)
                    }
                  />
                <Text style={{fontSize: 17, paddingLeft: 0, paddingRight: 1}}>$ </Text>
                <TextInput 
                  style={[styles.input, { width: 80 }]}
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
              
              {/* SMALL ITALIC TEXT - SCAN SOURCE INFO */}
              <Text style={styles.scanSource}>{item.scanSource}</Text>
              
              {/* DELETE BUTTON */}
              <TouchableOpacity style={styles.deleteButton} 
                onPress={() => {
                  removeItemFromScannedItems(item.id)
                }}>
                <Text style={{ color: 'white', fontSize: 16 }}>X</Text>
              </TouchableOpacity>

            </View>
          ))
        )}
      </ScrollView>

      {/* ACTION BUTTONS */}
      <View>
        <ScrollView horizontal 
                    style={{ paddingVertical: 23 }} 
                    contentContainerStyle={{ 
                      justifyContent: 'center',
                      paddingHorizontal: 18
                    }}
                    showsHorizontalScrollIndicator={false}>
          
          {/* UPC or QR CODE SCANNER BUTTON */}
          <TouchableOpacity 
            style={[styles.actionButton, {backgroundColor: '#ffffffff'}]}
            onPress={scanBarcode}
          >
            <Text style={[styles.actionButtonText, {color: 'black'}]}>
              {scanned ? 'Scanning...' : 'Scan Code'}
            </Text>
          </TouchableOpacity>
          
          {/* 'SCAN PRICE' - PRICE (OCR) DETECTION BUTTON */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#28a745' }]}
            onPress={captureAndProcessOCR}
            disabled={scanType === 'price'} // Use scanType instead
          >
            <Text style={styles.actionButtonText}>
              {scanType === 'price' ? 'Processing...' : 'Scan Price'}
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
      
      {/* TOTAL PRICE AMOUNT VIEW */}
      {/* <View style={styles.totalAmountView}> */}
        {/* <Text style={styles.total}> */}
          {/* Total: ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} */}
        {/* </Text> */}
      {/* </View> */}
      
      {/* BUTTON TO SCAN ANOTHER ITEM */}
      {/* <TouchableOpacity style={styles.buttonContainer} onPress={() => setScanned(false)}>
        <Text style={styles.buttonText}>scan another item</Text>
      </TouchableOpacity> */}

    </View>
  );
}

const styles = StyleSheet.create({

  totalAmountView: {
    marginBottom: 0
  },

  // Main container
  container: {
    flex: 1,
    backgroundColor: '#486493ff',
    // alignItems: 'center',
    // justifyContent: 'center',
  },

  // safeAreaViewContainer: {
  //   flex: 1,
  //   justifyContent: 'center',
  //   alignItems: 'center'
  // },

  cameraInfoContainer: {

    // flex: 1,
    // justifyContent: 'center',
    // alignItems: 'center',

    // flex: 1,
    // minHeight: 200,
    // width: '100%',
    // maxHeight: 400,
    // aspectRatio: 4/3

    // position: 'absolute',
    // bottom: 50,
    // backgroundColor: 'rgba(0,0,0,0.5)',
    // padding: 10,
    // borderRadius: 5,
    
    flex: 1,
    minHeight: 200,
    width: '100%',
    maxHeight: 400,
    aspectRatio: 4/3

  },

  cameraInfoText: {
    color: 'white',
    fontSize: 16,
  },
  
  // Camera container
  camera: {
    flex: 1,
    minHeight: 200,
    // width: '100%',
    // maxHeight: 400,
    // aspectRatio: 4/3
  },

  // Items List container
  itemsList: {
    maxHeight: 410,
    height: 410,
    backgroundColor: '#f8f9fa',
    paddingTop: 8,
  },

  // Item container
  item: { 
    // borderWidth: 1,
    // height: 120,
    padding: 11, 
    marginHorizontal: 12,
    marginVertical: 7,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // DELETE BUTTON
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ff4757',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0
  },

  // UPC container
  upc: { 
    fontSize: 16, 
    fontWeight: "700",
    color: '#2c3e50',
    marginBottom: 4,
  },

  // Input Row Container
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  label: {
    // borderWidth: 1,
    fontSize: 16,
    fontWeight: '600',
    width: 80,
    marginRight: 0,
    color: '#495057',
  },
  input: {
    borderWidth: 1,
    borderColor: "#e1e5e9",
    backgroundColor: '#f8f9fa',
    padding: 12,
    marginVertical: 4,
    marginRight: 14,
    width: 91,
    borderRadius: 8,
    fontSize: 16,
  },

  // Total Price amount container
  total: { 
    fontSize: 24, 
    fontWeight: "800", 
    margin: 16,
    // marginBottom: 36,
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

  // Horizontal Action Buttons section container
  // actionButtons: {
  //   // paddingHorizontal: 16,
  //   paddingVertical: 23,
  //   // height: 40,
  // },
  actionButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 12,
    width: 170
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
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

  // Scan source info text
  scanSource: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 2,
  },

});

// https://medium.com/@sanchit0496/how-to-integrate-camera-in-react-native-application-ae5bd501d9cd