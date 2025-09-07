import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Alert } from 'react-native';
import { exportReceiptToPDF } from './services/pdfService';

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

interface HistoryScreenProps {
  receipts: Receipt[];
  onViewReceipt: (receipt: Receipt) => void;
  onDeleteReceipt: (receiptId: string) => void;
}

export default function HistoryScreen({ receipts, onViewReceipt, onDeleteReceipt }: HistoryScreenProps) {
  
  // Track which receipt IDs are currently expanded using a Set for efficient lookups.
  const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set());
  
  // State for loading
  const [exportingPDF, setExportingPDF] = useState<string | null>(null);

  // Toggle function to,
  // add/remove receipt IDs from the expanded set when tapped.
  const toggleReceipt = (receiptId: string) => {
    setExpandedReceipts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(receiptId)) {
        newSet.delete(receiptId);
      } else {
        newSet.add(receiptId);
      }
      return newSet;
    });
  };

  // 
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

  return (
    <View style={styles.container}>
      
      <Text style={styles.header}>Receipt History</Text>

      <ScrollView style={styles.receiptsList}>
        {receipts.length === 0 ? (
          <Text style={styles.emptyMessage}>No receipts saved yet.</Text>
        ) : (
          receipts.map(receipt => (
            
            // Present each receipt item as a touchable button that will toggle its details.
            <TouchableOpacity 
              key={receipt.id} 
              style={styles.receiptItem}
              onPress={() => toggleReceipt(receipt.id)}
            >
              <Text style={styles.receiptDate}>{receipt.date}</Text>
              <Text style={styles.receiptDetails}>
                {receipt.items.length} items • ${receipt.total.toFixed(2)}
              </Text>

              {/* PDF EXPORT
                - Each receipt gets a "PDF" button next to the delete button
                - When pressed, it generates a PDF of that specific receipt with all its items
                - Shows loading state while generating
                - Uses the device's share dialog to let users save or share the PDF
                - The PDF includes a formatted table with item details and total
              */}
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

              {/* DELETE BUTTON */}
              <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={(e) => {
                  // e.preventDefault() prevents the button from triggering the parent TouchableOpacity's toggleReceipt function
                  // the delete button becomes a separate clickable area within the receipt item
                  e.preventDefault();
                  onDeleteReceipt(receipt.id);
                }}>
                  <Text style={{ color: 'white', fontSize: 16 }}>X</Text>
              </TouchableOpacity>

              
              {/* Show the items list only when the receipt is expanded. */}
              {expandedReceipts.has(receipt.id) && (
                <View style={styles.itemsList}>
                  {receipt.items.map(item => (
                    <View key={item.id} style={styles.itemRow}>
                      {/* <Text style={styles.itemType}>({item.type})</Text> */}
                      <Text style={styles.itemType}>{item.id}</Text>
                      <Text style={styles.itemDetails}>
                        Qty: {item.quantity} * ${item.price}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>

          ))
        )}
      </ScrollView>
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
  receiptsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  receiptItem: {
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
  receiptDate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  receiptDetails: {
    fontSize: 14,
    color: '#495057',
  },

  itemsList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },

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
  },

  itemType: {
    fontSize: 14,
    color: '#495057',
    flex: 1,
  },

  itemDetails: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },

  // PDF BUTTON
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

  
  emptyMessage: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 40,
  },
});