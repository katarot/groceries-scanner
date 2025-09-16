// Import React hooks and React Native components
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, Alert } from 'react-native';
// Import ZXing library for barcode scanning in web browsers
import { BrowserMultiFormatReader } from '@zxing/library';

// Define the props interface for the WebBarcodeScanner component
interface WebBarcodeScannerProps {
  onBarcodeScanned: (data: { type: string; data: string }) => void; // Callback function when barcode is detected
  style?: any; // Optional style prop
  facing?: 'front' | 'back', // Add facing prop
  onCaptureFrame?: (imageData: string) => void;
  // captureRef?: React.MutableRefObject<(() => void) | null>;
  captureRef?: React.RefObject<(() => void) | null>;
}


// 
export default function WebBarcodeScanner({ onBarcodeScanned, style, facing = 'back', onCaptureFrame, captureRef }: WebBarcodeScannerProps) {

  // Create a reference to the HTML video element for camera display
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize the ZXing barcode reader (only created once)
  const [codeReader] = useState(() => new BrowserMultiFormatReader());

  // PRICE SCAN
  const captureFrame = () => {
    if (videoRef.current) {
      // Create a canvas element using React NAtive's web implementation
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Get the video element - this needs to be passed from WebBarcodeScanner
      // Get the video element from WebBarcodeScanner
      // const videoElement = document.querySelector('video');
      // if (!videoElement) throw new Error('Video element not found');

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      // Draw current video frame to canvas
      ctx?.drawImage(videoRef.current, 0, 0);
      
      // Convert canvas to blob for Tesseract
      const imageData = canvas.toDataURL('image/png');
        
      onCaptureFrame?.(imageData);
    }
  }


  // useEffect to expose captureFrame globally
  useEffect(() => {
    console.log('WebBarcodeScanner: (for ...price?) useEffect hook');
    if (captureRef) {
      captureRef.current = captureFrame; // PRICE SCAN
    }
  }, [captureFrame]);
  

  // Effect hook to start barcode scanning when component mounts
  useEffect(() => {
    
    console.log('WebBarcodeScanner: (for barcode) useEffect hook');

    // Only run on web platform (not on native mobile)
    if (Platform.OS !== 'web') return;

    // Async function to initialize camera and start scanning
    const startScanning = async () => {
      try {
        
        console.log('WebBarcodeScanner: startScanning async ()');

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        console.log('WebBarcodeScanner: navigator.mediaDevices.getUserMedia');
        console.log(stream);
        console.log('WebBarcodeScanner: stream.getTracks()');
        console.log(stream.getTracks());
        stream.getTracks().forEach(track => track.stop());
        
        // Get all available media devices (cameras, microphones, etc.)
        // Return all available video input devices (including identifiers for ultra-wider, wide, and telephoto cameras).
        const videoInputDevices = await navigator.mediaDevices.enumerateDevices();
        
        // Filter to get only video input devices (cameras)
        const videoDevices = videoInputDevices.filter(device => device.kind === 'videoinput');
        console.log("WebBarcodeScanner: videoInputDevices.filter");
        console.log(videoDevices);
        
        // Select camera based on facing preference
        let selectedDeviceId;
        if (facing === 'back') {
          
          // For back camera, prefer cameras with these keywords or the last camera (usually back)
          const backCamera = videoDevices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear') || 
            device.label.toLowerCase().includes('environment')
          ) || videoDevices[videoDevices.length - 1]; // Last camera is often back camera
          
          selectedDeviceId = backCamera?.deviceId;

          console.log("WebBarcodeScanner: selectedDeviceId: (before Tardis test camera): " + selectedDeviceId);

          // FOR TESTING PURPOSES locally - Tardis Camera
          const tardisBackCamera = videoDevices.find(
            device => device.label.toLowerCase().includes("tardis camera")
          );
          selectedDeviceId = tardisBackCamera?.deviceId;
          
          console.log("WebBarcodeScanner: selectedDeviceId: (after Tardis test camera): " + selectedDeviceId);
        
        } else {
          // For front camera, prefer first camera or cameras with front/user keywords
          const frontCamera = videoDevices.find(device => 
            device.label.toLowerCase().includes('front') ||
            device.label.toLowerCase().includes('user')
          ) || videoDevices[0];
          // selectedDeviceId = frontCamera[0]?.deviceId;
          selectedDeviceId = frontCamera?.deviceId;
          console.log("WebBarcodeScanner: front selectedDeviceId: " + selectedDeviceId);
        }
        
        // If we have a video element and a camera device
        if (videoRef.current && selectedDeviceId) {
          
          // videoRef.current =>
          // <video style="width: 100%; height: 100%; object-fit: cover;" autoplay="true" muted="true" playsinline="true"></video>

          // Start decoding barcodes from the selected camera device
          // .decodeFromVideoDevice - Continuously tries to decode the barcode from the device specified by device while showing the video in the specified video element.
          await codeReader.decodeFromVideoDevice(
            selectedDeviceId, // Camera device ID
            videoRef.current, // HTML video element to display camera feed
            (result, error) => { // Callback function for scan results
              if (result) {
                // When barcode is successfully scanned, call the parent callback
                onBarcodeScanned({ // function handleBarCodeScanned in ScannerScreen
                  type: result.getBarcodeFormat().toString().toLowerCase(), // Barcode format (qr, ean13, etc.)
                  data: result.getText() // Barcode content/data
                });
              }
            }
          );
        }
      } catch (error) {
        // Log any errors that occur during camera initialization
        console.error('WebBarcodeScanner: Error starting barcode scanner:', error);
      }
    };

    // Start the scanning process
    startScanning();

    // Cleanup function: stop the scanner when component unmounts
    return () => {
      codeReader.reset();
    };
  }, [codeReader, onBarcodeScanned]); // Dependencies: re-run if codeReader or callback changes


  // Don't render anything on non-web platforms
  if (Platform.OS !== 'web') {
    return null;
  }


  // Render the video element inside a React Native View
  return (
    <View style={[styles.container, style]}>
      {/* HTML video element to display camera feed */}
      <video
        ref={videoRef} // Reference for ZXing library to access
        style={{
          width: '100%', // Full width of container
          height: '100%', // Full height of container
          objectFit: 'cover' // Maintain aspect ratio, crop if necessary
        }}
      />
    </View>
  );
}


// Styles for the container
const styles = StyleSheet.create({
  container: {
    flex: 1, // Take available space
    minHeight: 300, // Minimum height for camera display
    width: '100%' // Full width
  }
});