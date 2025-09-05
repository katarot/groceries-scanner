# PDF Export Service for React Native Receipts

This documentation shows how to implement PDF export functionality for receipt data using Expo libraries.

## Overview

This implementation allows users to export individual receipts as PDF files with a formatted table of items, totals, and professional styling.

## Dependencies

Install the required Expo packages:

```bash
npx expo install expo-print expo-file-system expo-sharing
```

## Implementation Steps

### Step 1: Create PDF Service File

Create a new file: `services/pdfService.ts`

```typescript
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

type Item = {
  id: string;
  type: string;
  price: string;
  quantity: string;
};

type Receipt = {
  id: string;
  date: string;
  items: Item[];
  total: number;
};

const generateReceiptHTML = (receipt: Receipt): string => {
  const itemsHTML = receipt.items.map(item => `
    <tr>
      <td>${item.id}</td>
      <td>${item.quantity}</td>
      <td>$${item.price}</td>
      <td>$${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { font-weight: bold; font-size: 18px; text-align: right; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Receipt</h1>
          <p>Date: ${receipt.date}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        
        <div class="total">
          Total: $${receipt.total.toFixed(2)}
        </div>
      </body>
    </html>
  `;
};

export const exportReceiptToPDF = async (receipt: Receipt): Promise<void> => {
  try {
    const html = generateReceiptHTML(receipt);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const fileName = `receipt_${receipt.date.replace(/[/\s:]/g, '_')}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });

    await Sharing.shareAsync(newUri);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw error;
  }
};
```

### Step 2: Update HistoryScreen Component

In your `HistoryScreen.tsx` file, make these additions:

#### Add Imports
```typescript
import { Alert } from 'react-native';
import { exportReceiptToPDF } from '../services/pdfService';
```

#### Add State (inside the component function)
```typescript
const [exportingPDF, setExportingPDF] = useState<string | null>(null);
```

#### Add Handler Function
```typescript
const handleExportPDF = async (receipt: Receipt) => {
  setExportingPDF(receipt.id);
  try {
    await exportReceiptToPDF(receipt);
    Alert.alert('Success', 'Receipt exported successfully!');
  } catch (error) {
    Alert.alert('Error', 'Failed to export receipt');
  } finally {
    setExportingPDF(null);
  }
};
```

#### Add Export Button (in JSX, after the delete button)
```typescript
<TouchableOpacity 
  style={styles.exportButton} 
  onPress={(e) => {
    e.preventDefault();
    handleExportPDF(receipt);
  }}
  disabled={exportingPDF === receipt.id}
>
  <Text style={{ color: 'white', fontSize: 12 }}>
    {exportingPDF === receipt.id ? '...' : 'PDF'}
  </Text>
</TouchableOpacity>
```

#### Add Button Style (in StyleSheet)
```typescript
exportButton: {
  position: 'absolute',
  top: 8,
  right: 45,
  backgroundColor: '#007bff',
  borderRadius: 12,
  paddingHorizontal: 8,
  paddingVertical: 4,
  justifyContent: 'center',
  alignItems: 'center',
},
```

## How It Works

### PDF Generation Process
1. **HTML Template**: Creates a structured HTML document with receipt data
2. **Styling**: Applies CSS for professional appearance with tables and formatting
3. **PDF Conversion**: Uses `expo-print` to convert HTML to PDF format
4. **File Management**: Saves PDF with sanitized filename using `expo-file-system`
5. **Sharing**: Opens native share dialog with `expo-sharing`

### Key Functions

- `generateReceiptHTML()`: Converts receipt data into formatted HTML
- `exportReceiptToPDF()`: Main export function that handles the entire PDF creation and sharing process
- `handleExportPDF()`: UI handler that manages loading states and error handling

## Features

- Professional receipt formatting with table layout
- Item-by-item breakdown with calculated subtotals
- Loading states during PDF generation
- Error handling with user-friendly alerts
- Clean filename generation (removes special characters)
- Native sharing integration for save/send options
- Disabled state prevents multiple simultaneous exports

## File Structure

```
project/
├── services/
│   └── pdfService.ts          # PDF generation service
└── HistoryScreen.tsx          # Updated component with export functionality
```

## Usage

Users can tap the "PDF" button next to any receipt to:
1. Generate a formatted PDF of that receipt
2. Save it to their device
3. Share it via email, messaging, or other apps
4. View a professional receipt layout with all item details

This implementation provides a complete PDF export solution that integrates seamlessly with existing receipt management functionality.