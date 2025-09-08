import { Camera, CameraView } from 'expo-camera'; // expo-camera doesn't work properly on web - it's designed for native app
// import { Camera, useCameraDevices, useCodeScanner, getCameraDevice, CodeScanner } from 'react-native-vision-camera';
import { useEffect, useState, useRef } from 'react';
import { Alert, Platform, SafeAreaView, StyleSheet, Text, TextInput, View, ScrollView, TouchableOpacity } from 'react-native';
import WebBarcodeScanner from './WebBarcodeScanner';
import Tesseract from 'tesseract.js';

// Item object type 
type Item = {
  id: string; // UPC code
  type: string;
  name: string;
  price: string;
  quantity: string;
};

// Scanner screen properties interface
interface ScannerScreenProps {
  scannedItems: Item[];
  setScannedItems: (items: Item[]) => void;
}

/** 
    SCANNER SCREEN FUNCTION (scannedItems, setScannedItems)
*/
export default function ScannerScreen({ scannedItems, setScannedItems }: ScannerScreenProps) {
  
  // Create hasPermission as a stateful boolean value, and setHasPermission function to handle it.
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Fallback for permission
  const [showFallback, setShowFallback] = useState(false);

  // Create scanned stateful value, and setScanned function to handle it, initializing it to false.
  const [scanned, setScanned] = useState(false);

  // 
  const [isScanning, setIsScanning] = useState<boolean>(true);

  // OCR state
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [detectedPrice, setDetectedPrice] = useState<string | null>(null);

  // 
  const captureRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    (async () => {
      // Asks the user to grant permissions for accessing camera, 
      // then set permission state value –hasPermission– to true by using (status === 'granted').

      if (Platform.OS === 'web') {
        // For web, handle permission in WebBarcodeScanner component.
        // The WebBarcodeScanner component will handle its own camera permissions 
        // when it tries to access navigator.mediaDevices. 
        // If the user denies camera access in the browser, the WebBarcodeScanner will 
        // catch the error and log it.
        // Web: Always proceeds to show WebBarcodeScanner (which handles its own permissions)
        setHasPermission(true);
      } else {
        // For native apps, use expo-camera persmissions
        const { status } = await Camera.requestCameraPermissionsAsync();
        console.log('Permission status: ', status);
        setHasPermission(status === "granted"); 
        // Native: Uses expo-camera permission system
      }

      console.log('Platform.OS');
      console.log(Platform.OS);

      // This below is using react-native-vision-camera
      // const cameraPermission = await Camera.requestCameraPermission();
      // console.log('Camera permission: ', cameraPermission);
      // setHasPermission(cameraPermission === "granted");
    })();
  }, []);
  
  // Barcode Scan
  const handleBarCodeScanned = ({type, data}: {type: string; data: string}) => {
    // When the camera detects the barcode, set the scanned state true, 
    // and include scanned information data into scannedItems state list. 
    //  type param - The barcode type.
    //  data param - The parsed information encoded in the barcode.
    
    // setIsScanning(true);
    console.log(`Scan info – type: ${type}, data: ${data}`);
    // Set scanned state value to true.
    setScanned(true);

    // Alert.alert('Scanned!', `${type.toUpperCase()}: ${data}`);

    // Check for items in scannedItems list that are not passed in the data parameter, 
    // if so, then include an Item object into the scanned items state list.
    setScannedItems(
      [...scannedItems
        .filter(item => item.id !== data), 
        { id: data, type: type === 'ean13' ? 'UPC' : type === 'qr' ? 'QR' : type, name: '', price: '', quantity: '1' }]);
        
    // setIsScanning(false);
    
    // After 2 seconds, set the scanned state value to false.
    setTimeout(() => setScanned(false), 2000);  // Because the scanned boolean state has to be false in order to scan again.
  
  };

  // OCR processing callback - OCR processing happens here asynchronously.
  const handleCapturedFrame = async (imageData: string) => {
    try {
      const { data: { text } } = await Tesseract.recognize(imageData, 'eng');
      const priceMatch = text.match(/\$?\d+\.\d{2}/);
      if (priceMatch) {
        setDetectedPrice(priceMatch[0]);
      }
    } catch (error) {
      console.error('Tesseract Error:', error);
    } finally {
      setOcrProcessing(false);
    }
  };

  // OCR function
  const captureAndProcessOCR = async () => {
    setOcrProcessing(true);
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
      setOcrProcessing(false);
    }
  };
  
  // Whenever the price or quantity value changes, 
  // we update the scanned items state list with the new item price or quantity.
  // price onChangeText -> update item price
  const updateItem = (id: string, field: "price" | "quantity", value: string) => {
    setScannedItems(
      scannedItems.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };
  
  // Calculate running total, total automatically recalculates 
  // whenever an item's price or quantity changes.
  const total = scannedItems.reduce(
    (sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0), 0
  );
  
  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }
  if (hasPermission === false) {
    console.log('hasPermission: ', hasPermission);
    // console.log();
    // console.log();
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

  // REMOVE ITEM FROM SCANNED LIST
  const removeItemFromScannedItems = (id: string) => {
    // Alert.alert(`
    //   Removing item from list:\n${id}  
    // `);
    setScannedItems(scannedItems.filter(item => item.id != id));
  };

  // This below is for react-native-vision-camera
  // Fetch a list of available camera devices and select the back camera for barcode scanning. 
  // const devices = useCameraDevices();
  // const device = getCameraDevice(devices, "back");

  // Configure the barcode scanner using the useCodeScanner() hook, which requires two main properties: codeTypes and onCodeScanned.
  // const codeScanner: CodeScanner = useCodeScanner({
  //   codeTypes: ['ean-13'], // remember qr code too
  //   // codeTypes: ['qr', 'ean-13'],
  //   onCodeScanned: (codes) => {
  //     for (const code of codes) {
  //       setIsScanning(false);
  //       console.log(`Scanned ${codes.length} codes!`);
  //       console.log(`Code Value: ${code.value}`);
  //       Alert.alert('Scanned Code', `${code.value}`, [
  //         {
  //           text: 'OK',
  //           onPress: () => setIsScanning(true), // Stop scanning after alert
  //         }
  //       ]);
  //     }
  //   },
  // });

  // Handle the UI response for loading the camer and managing permission.
  // if (!device) return <Text>Loading camera...</Text>;
  // if (device == null) return <Text>Loading camera...</Text>;
  // if (!hasPermission) return <Text>No camera permission</Text>;
  
  return (
    <View style={styles.container}>

      {/* CAMERA SECTION */}
      {Platform.OS === 'web' ? (
        <WebBarcodeScanner
          onBarcodeScanned={scanned ? () => {} : handleBarCodeScanned}
          style={styles.camera}
          facing="back"
          captureRef={captureRef}
          onCaptureFrame={handleCapturedFrame}
        />
      ) : (
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
      )}
      
      {/* <SafeAreaView style={styles.safeAreaViewContainer}> */}
      {/* <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        // frameProcessorFps={2}
        // codeScanner={codeScanner}
        // codeScanner={isScanning ? codeScanner : undefined}
      > */}
        {/* <View style={styles.cameraInfoContainer}>
          <Text style={styles.cameraInfoText}>Point the camera at a code</Text>
        </View> */}
      {/* </Camera> */}
      {/* </SafeAreaView> */}
      
      {/* TOTAL PRICE AMOUNT */}
      <Text style={styles.total}>
        Total: ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </Text>

      {/* SCANNED ITEMS LIST */}
      <ScrollView style={styles.itemsList}>
        
        {(() => {
          console.log(`Scanned items list: `, scannedItems);
          return null;
        })()}

        {scannedItems.length === 0 ? (
          <Text style={styles.emptyMessage}>No items scanned yet. Scan a barcode to get started!</Text>
        ) : (
          scannedItems.slice().reverse().map(item => (
            
            // Main View container of an item
            <View key={item.id} style={styles.item}>

              {/* UPC LABEL */}
              <Text style={styles.upc}>{item.type.toUpperCase()}: {item.id}</Text>

              {/* DELETE BUTTON */}
              <TouchableOpacity style={styles.deleteButton} 
                onPress={() => {
                  removeItemFromScannedItems(item.id)
                }}>
                <Text style={{ color: 'white', fontSize: 16 }}>X</Text>
              </TouchableOpacity>

              {/* PRICE AND QUANTITY */}
              <View style={styles.inputRow}>
                
                {/* PRICE LABEL */}
                <Text style={[styles.label, { width: 55 }]}>Price:</Text>
                
                {/* PRICE INPUT */}
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
              {/* </View> */}
              
              {/* <View style={styles.inputRow}> */}

                {/* QUANTITY LABEL */}
                <Text style={styles.label}>Quantity:</Text>

                {/* QUANTITY INPUT */}
                <TextInput 
                  style={[styles.input, { width: 71 }]}
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
          {/* <TouchableOpacity style={styles.actionButton} onPress={() => {
            setScannedItems([]);
            setScanned(false);
          }}>
            <Text style={styles.actionButtonText}>Clear All</Text>
          </TouchableOpacity> */}

          {/* UPC BARCODE SCANNER BUTTON */}
          <TouchableOpacity style={[styles.actionButton, {backgroundColor: '#444fe6ff'}]}>
            <Text style={styles.actionButtonText}>
              {scanned ? 'Scanning...' : 'Scan Barcode'}
              </Text>
          </TouchableOpacity>

          {/* OCR PRICE DETECTION BUTTON */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#28a745' }]}
            onPress={captureAndProcessOCR}
            disabled={ocrProcessing}
          >
            <Text style={styles.actionButtonText}>
              {ocrProcessing ? 'Processing...' : 'Scan Price'}
            </Text>
          </TouchableOpacity>

          {/* QR CODE SCANNER BUTTON */}
          <TouchableOpacity style={[styles.actionButton, {backgroundColor: '#ffffffff'}]}>
            <Text style={[styles.actionButtonText, {color: 'black'}]}>
              Scan QR Code
            </Text>
          </TouchableOpacity>


        </ScrollView>
      </View>

      {/* TOTAL PRICE AMOUNT VIEW */}
      <View style={styles.totalAmountView}>
        <Text style={styles.total}>Total: ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        {detectedPrice && (
          <Text style={[styles.total, { color: '#28a745', fontSize: 18 }]}>
            Detected Price: {detectedPrice}
          </Text>
        )}
      </View>
      
      {/* BUTTON TO SCAN ANOTHER ITEM */}
      {/* <TouchableOpacity style={styles.buttonContainer} onPress={() => setScanned(false)}>
        <Text style={styles.buttonText}>scan another item</Text>
      </TouchableOpacity> */}

    </View>
  );
}

const styles = StyleSheet.create({

  totalAmountView: {
    marginBottom: 15
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