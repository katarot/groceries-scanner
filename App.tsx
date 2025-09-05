import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Alert, Text } from 'react-native';
import ScannerScreen from './ScannerScreen';
import ItemsScreen from './ItemsScreen';
import HistoryScreen from './HistoryScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Item object type
type Item = {
  id: string; // UPC code
  type: string;
  // name: string;
  price: string;
  quantity: string;
};

// Receipt object type
type Receipt = {
  id: string;
  date: string;
  items: Item[];
  total: number;
};

// 
const STORAGE_KEYS = {
  SCANNED_ITEMS: 'scannedItems', 
  RECEIPTS: 'receipts'
};

// Tab creation
const Tab = createBottomTabNavigator();

// Main App function
export default function App() {

  /** HOOKS  */
  
  // Make scannedItems as a stateful value containing a list of Item,
  // and use setScannedItems function to handle it.
  const [scannedItems, setScannedItems] = useState<Item[]>([]);

  // Make receipts as a stateful value containing a list of Receipt,
  // and use setReceipts function to handle it.
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  // Load data on app start, to ensure the user sees their data immediately when reopening the app.
  useEffect(() => {
    loadScannedItemsFromStorage();
    loadReceiptsFromStorage();
  }, []);

  // Auto-Save scanned items, which:
  // - watches scannedItems state - runs whenever the cart changes
  // - auto-saves to storage whenever items are added, removed, or modified
  // - no manual save needed - happens automatically in background
  useEffect(() => {
    saveScannedItemsToStorage(scannedItems);
  }, [scannedItems]);

  // Auto-save receipts, which:
  // - watches receipts states - runs whenever the receipt history changes
  // - auto-saves to storage whenever new receipts are saved
  // - persists receipts in history so users don't lose their saved receipts
  useEffect(() => {
    saveReceiptsToStorage(receipts);
  }, [receipts]);
  

  /** FUNCTIONS  */

  // LOAD FROM ASYNC STORAGE
  const loadScannedItemsFromStorage = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.SCANNED_ITEMS);
      if (saved) setScannedItems(JSON.parse(saved));
    } catch(error) {
      console.error('Failed to load scanned items: ', error);
    }
  };
  
  const loadReceiptsFromStorage = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.RECEIPTS);
      if (saved) setReceipts(JSON.parse(saved));
    } catch(error) {
      console.error('Failed to load scanned items: ', error);
    }
  };

  // SAVE INTO ASYNC STORAGE
  const saveScannedItemsToStorage = async (items: Item[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SCANNED_ITEMS, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save scanned items: ', error);
    }
  };
  
  const saveReceiptsToStorage = async (receipts: Receipt[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(receipts));
    } catch (error) {
      console.error('Failed to save receipts: ', error);
    }
  };

  // DELETE RECEIPT FROM STORAGE
  const deleteReceiptFromStorage = async (receiptId: string) => {
    try {
      // Filter out the specific receipt from the receipts array.
      const updatedReceipts = receipts.filter(receipt => receipt.id !== receiptId);
      // Setting the state will automatically trigger the useEffect that saves to AsyncStorage.
      // When a receipt is deleted, it's removed from both the state and automatically saved to AsyncStorage
      // through the existing useEffect.
      setReceipts(updatedReceipts);
    } catch (error) {
      console.error(`Failed to delete rececipt: ${receiptId}.\nError: ${error}.`);
    }
  };
  
  // Function to create/generate (save) the receipt.
  const saveReceipt = () => {
    
    // Do nothing if there are no scanned items.
    // These scanned items are set in the ScannerScreen component.
    if (scannedItems.length === 0) return;
    
    // Calculate total 
    // of all the items * quantity for the total receipt amount.
    const total = scannedItems.reduce(
      (sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0), 0
    );
    
    // Create receipt object 
    // using date time for id, date, and 
    // scanned items Item list for its items, along with the total amount.
    const newReceipt: Receipt = {
      id: Date.now().toString(),
      date: new Date().toLocaleString('en-US', {
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      items: [...scannedItems],
      total
    };
    
    // Set (add) new receipt into receipts list state.
    setReceipts(prev => [newReceipt, ...prev]);

    // Set/Clear (make new) scanne items list state.
    setScannedItems([]);

    Alert.alert('Success', 'Receipt saved successfully!\nSee History tab.');
  };


  // Function to show (as a alert message) 
  // the user the receipt created.
  const viewReceipt = (receipt: Receipt) => {
    Alert.alert(
      `Receipt - ${receipt.date}`,
      receipt.items.map(item => 
        `${item.id}: $${parseFloat(item.price) || 0} × ${parseInt(item.quantity) || 0}`
      ).join('\n') + `\n\nTotal: $${receipt.total.toFixed(2)}`
    );
  };

  return (

    // TAB NAVIGATION CONTAINER
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#009688',
          tabBarInactiveTintColor: '#6c757d',
          headerShown: false,
          tabBarLabelStyle: { fontSize: 16 },
          tabBarStyle: {
            paddingBottom: 10,
            height: 70,
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e0e0e0',
          }
        }}
      >

        {/* MAIN SCANNER SCREEN */}
        <Tab.Screen 
          name="Scanner" 
          options={{ 
            tabBarLabel: 'Scanner',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ color, fontSize: size }}>📷</Text>
            )
          }}
        >
          {() => <ScannerScreen scannedItems={scannedItems} setScannedItems={setScannedItems} />}
        </Tab.Screen>

        
        {/* ITEMS SCREEN */}
        <Tab.Screen 
          name="Items" 
          options={{ 
            tabBarLabel: 'Items',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ color, fontSize: size }}>📋</Text>
            )
          }}
        >
          {() => <ItemsScreen scannedItems={scannedItems} setScannedItems={setScannedItems} onSaveReceipt={saveReceipt} />}
        </Tab.Screen>
        
        
        {/* HISTORY SCREEN */}
        <Tab.Screen 
          name="History" 
          options={{ 
            tabBarLabel: 'History',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ color, fontSize: size }}>📄</Text>
            )
          }}
        >
          {() => <HistoryScreen receipts={receipts} onViewReceipt={viewReceipt} onDeleteReceipt={deleteReceiptFromStorage} />}
        </Tab.Screen>
      </Tab.Navigator>

    </NavigationContainer>
  );
}
