# HistoryScreen Component Documentation

## Overview
The HistoryScreen component displays a list of saved receipts with collapsible functionality, allowing users to view receipt summaries and expand them to see detailed item information.

## Features
- **Collapsible Receipt Items**: Tap any receipt to expand/collapse item details
- **Visual Indicators**: Animated chevron icons and color changes for expanded state
- **Smooth Animations**: Layout animations for expand/collapse transitions
- **Detailed Item Display**: Shows item type, price, and quantity when expanded

## Component Structure

### Props Interface
```typescript
interface HistoryScreenProps {
  receipts: Receipt[];
  onViewReceipt: (receipt: Receipt) => void;
}
```

### Data Types
```typescript
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
```

## Implementation Guide

### 1. State Management
```typescript
const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set());
const rotationValues = useRef<Map<string, Animated.Value>>(new Map()).current;
```
- `expandedReceipts`: Tracks which receipts are currently expanded
- `rotationValues`: Manages chevron rotation animations

### 2. Animation Setup
```typescript
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
```
Enables layout animations on Android devices.

### 3. Toggle Functionality
```typescript
const toggleReceipt = (receiptId: string) => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  
  const rotationValue = getRotationValue(receiptId);
  const isExpanded = expandedReceipts.has(receiptId);
  
  Animated.timing(rotationValue, {
    toValue: isExpanded ? 0 : 1,
    duration: 300,
    useNativeDriver: true,
  }).start();
  
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
```

## Visual Components

### Receipt Header
```typescript
<View style={styles.receiptHeader}>
  <View style={styles.receiptInfo}>
    <Text style={styles.receiptDate}>{receipt.date}</Text>
    <Text style={styles.receiptDetails}>
      {receipt.items.length} items • ${receipt.total.toFixed(2)}
    </Text>
  </View>
  <Animated.Text style={[styles.chevron, { transform: [{ rotate: '...' }] }]}>
    ▶
  </Animated.Text>
</View>
```

### Expandable Items List
```typescript
{expandedReceipts.has(receipt.id) && (
  <View style={styles.itemsList}>
    {receipt.items.map(item => (
      <View key={item.id} style={styles.itemRow}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemType}>{item.type}</Text>
          <Text style={styles.itemPrice}>${item.price}</Text>
        </View>
        <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
      </View>
    ))}
  </View>
)}
```

## Styling Guide

### Key Style Properties
- **receiptItemExpanded**: Different background color and border for expanded receipts
- **chevron**: Animated arrow indicator with rotation transform
- **itemsList**: Nested container with visual separation from receipt header
- **itemRow**: Horizontal layout for item details with proper spacing

### Color Scheme
- **Primary**: `#007bff` (chevron, expanded border)
- **Success**: `#28a745` (item prices)
- **Neutral**: `#6c757d` (secondary text)
- **Background**: `#f8f9fa` (expanded state)

## Animation Details

### Layout Animation
- **Type**: `LayoutAnimation.Presets.easeInEaseOut`
- **Trigger**: On receipt toggle
- **Effect**: Smooth expand/collapse of items list

### Chevron Rotation
- **Duration**: 300ms
- **Range**: 0° to 90° rotation
- **Native Driver**: Enabled for performance

## Usage Example

```typescript
<HistoryScreen 
  receipts={savedReceipts}
  onViewReceipt={(receipt) => {
    // Handle receipt selection if needed
    console.log('Receipt selected:', receipt.id);
  }}
/>
```

## Benefits

1. **Improved UX**: Users can quickly scan receipts without losing context
2. **Space Efficient**: Detailed information available on-demand
3. **Visual Feedback**: Clear indicators for interactive elements
4. **Smooth Interactions**: Professional animations enhance user experience
5. **Scalable**: Handles any number of receipts and items efficiently

## Performance Considerations

- Uses `Set` for O(1) lookup performance on expanded receipts
- Native driver animations for smooth 60fps performance
- Conditional rendering prevents unnecessary item list renders
- Efficient state updates with functional setState patterns