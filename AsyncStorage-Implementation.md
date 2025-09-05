# AsyncStorage Implementation Guide

## Adding Local Persistence to UPC Scanner App

This guide explains how to implement AsyncStorage to persist scanned items and receipt history between app restarts in a React Native Expo app.

## Overview

The implementation adds local device storage to save:
- **Scanned Items**: Current shopping cart items
- **Receipt History**: Previously saved receipts

Data persists automatically without user intervention and loads when the app starts.

## Step-by-Step Implementation

### Step 1: Install AsyncStorage

```bash
npm install @react-native-async-storage/async-storage
```

### Step 2: Import AsyncStorage

Add to the top of `App.tsx`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
```

### Step 3: Define Storage Keys

Add constants after type definitions:

```typescript
const STORAGE_KEYS = {
  SCANNED_ITEMS: 'scannedItems',
  RECEIPTS: 'receipts'
};
```

### Step 4: Create Load Functions

Add before existing functions:

```typescript
const loadScannedItems = async () => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.SCANNED_ITEMS);
    if (saved) setScannedItems(JSON.parse(saved));
  } catch (error) {
    console.error('Failed to load scanned items:', error);
  }
};

const loadReceipts = async () => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.RECEIPTS);
    if (saved) setReceipts(JSON.parse(saved));
  } catch (error) {
    console.error('Failed to load receipts:', error);
  }
};
```

### Step 5: Create Save Functions

Add after load functions:

```typescript
const saveScannedItemsToStorage = async (items: Item[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SCANNED_ITEMS, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save scanned items:', error);
  }
};

const saveReceiptsToStorage = async (receipts: Receipt[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(receipts));
  } catch (error) {
    console.error('Failed to save receipts:', error);
  }
};
```

### Step 6: Load Data on App Start

Add after state declarations:

```typescript
useEffect(() => {
  loadScannedItems();
  loadReceipts();
}, []);
```

### Step 7: Auto-Save Scanned Items

Add after previous useEffect:

```typescript
useEffect(() => {
  saveScannedItemsToStorage(scannedItems);
}, [scannedItems]);
```

### Step 8: Auto-Save Receipts

Add after previous useEffect:

```typescript
useEffect(() => {
  saveReceiptsToStorage(receipts);
}, [receipts]);
```

## How It Works

### Data Flow
1. **App Launch**: `useEffect` with empty dependency array loads saved data
2. **State Changes**: `useEffect` with state dependencies auto-saves changes
3. **App Restart**: Previously saved data loads automatically

### Storage Operations
- **JSON Serialization**: Objects converted to strings for storage
- **Error Handling**: Try-catch blocks prevent crashes
- **Automatic Persistence**: No manual save buttons needed

### Storage Keys
- `scannedItems`: Current cart items
- `receipts`: Receipt history array

## Benefits

- ✅ **Seamless UX**: Data persists between app sessions
- ✅ **Automatic**: No user action required
- ✅ **Offline**: Works without internet connection
- ✅ **Reliable**: Error handling prevents data loss
- ✅ **Performance**: Minimal overhead with async operations

## Technical Notes

### AsyncStorage Characteristics
- **Platform**: Works on iOS, Android, and web
- **Capacity**: Suitable for app data (not large files)
- **Async**: Non-blocking operations
- **JSON**: Stores strings (objects need serialization)

### Error Handling
All storage operations include try-catch blocks to:
- Prevent app crashes
- Log errors for debugging
- Gracefully handle storage failures

### Performance Considerations
- Auto-save triggers on every state change
- JSON serialization happens on each save
- Consider debouncing for high-frequency updates if needed

## Troubleshooting

### Common Issues
1. **Import Error**: Ensure correct AsyncStorage import syntax
2. **JSON Parse Error**: Validate stored data format
3. **Storage Full**: Handle storage quota exceeded errors

### Testing
- Test app restart scenarios
- Verify data persistence across sessions
- Check error handling with invalid data

## Future Enhancements

Potential improvements:
- Data migration for schema changes
- Compression for large datasets
- Backup/restore functionality
- Data encryption for sensitive information