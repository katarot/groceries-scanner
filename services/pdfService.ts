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
            <td>${item.price}</td>
            <td>$${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}</td>
        </tr>
    `).join('');
    return `
        <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .receipt-info { margin-bottom: 20px; }
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
}

export const exportReceiptToPDF = async (receipt: Receipt): Promise<void> => {
    // exportReceiptToPDF() converts HTML to PDF, 
    // saves it with a clean filename, and opens the share dialog
    try {
        // generateReceiptHTML() creates an HTML template with a table showing all items
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
        console.error('Error exporting PDF: ', error);
        throw error;
    }
};
