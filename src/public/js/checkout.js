// Checkout handling
const checkout = {
    async initializeCheckout() {
        // Get cart data
        const cartData = await this.getCartData();
        this.displayOrderSummary(cartData);
        this.setupEventListeners();
    },

    async getCartData() {
        try {
            const response = await fetch('/api/cart');
            return await response.json();
        } catch (error) {
            console.error('Error fetching cart:', error);
            throw error;
        }
    },

    displayOrderSummary(cartData) {
        // Display cart items, total, etc.
        const summaryHTML = `
            <div class="order-summary">
                <h3>Order Summary</h3>
                ${this.generateItemsList(cartData.items)}
                <div class="total">
                    <p>Subtotal: ₱${cartData.totalAmount.toFixed(2)}</p>
                    <p id="deliveryFee">Delivery Fee: ₱0.00</p>
                    <p id="finalTotal">Total: ₱${cartData.totalAmount.toFixed(2)}</p>
                </div>
            </div>
        `;
        document.getElementById('orderSummaryContainer').innerHTML = summaryHTML;
    },

    generateItemsList(items) {
        return items.map(item => `
            <div class="order-item">
                <p>${item.product.name} x ${item.quantity}</p>
                <p>Size: ${item.size || 'N/A'}</p>
                ${item.addOns?.length ? `<p>Add-ons: ${item.addOns.map(addon => addon.name).join(', ')}</p>` : ''}
                <p>₱${item.totalPrice.toFixed(2)}</p>
            </div>
        `).join('');
    },

    setupEventListeners() {
        // Delivery method selection
        const deliveryMethodSelect = document.getElementById('deliveryMethod');
        deliveryMethodSelect.addEventListener('change', (e) => {
            const addressContainer = document.getElementById('deliveryAddressContainer');
            const deliveryFeeElement = document.getElementById('deliveryFee');
            const finalTotalElement = document.getElementById('finalTotal');
            
            if (e.target.value === 'delivery') {
                addressContainer.style.display = 'block';
                deliveryFeeElement.textContent = 'Delivery Fee: ₱50.00';
                // Update final total
                const currentTotal = parseFloat(finalTotalElement.textContent.split('₱')[1]);
                finalTotalElement.textContent = `Total: ₱${(currentTotal + 50).toFixed(2)}`;
            } else {
                addressContainer.style.display = 'none';
                deliveryFeeElement.textContent = 'Delivery Fee: ₱0.00';
                // Update final total
                const currentTotal = parseFloat(finalTotalElement.textContent.split('₱')[1]);
                finalTotalElement.textContent = `Total: ₱${(currentTotal - 50).toFixed(2)}`;
            }
        });

        // Place order button
        document.getElementById('placeOrderBtn').addEventListener('click', async () => {
            await this.placeOrder();
        });
    },

    async placeOrder() {
        try {
            const deliveryMethod = document.getElementById('deliveryMethod').value;
            const deliveryAddress = document.getElementById('deliveryAddress')?.value;

            if (deliveryMethod === 'delivery' && !deliveryAddress) {
                alert('Please enter delivery address');
                return;
            }

            const orderData = {
                deliveryMethod,
                deliveryAddress: deliveryMethod === 'delivery' ? deliveryAddress : ''
            };

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            const result = await response.json();

            if (response.ok) {
                // Show success message
                alert(`Order placed successfully! Order ID: ${result.order._id}`);
                // Redirect to order tracking page
                window.location.href = `/orders/${result.order._id}`;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error placing order:', error);
            alert('Failed to place order. Please try again.');
        }
    }
};

// Initialize checkout when page loads
document.addEventListener('DOMContentLoaded', () => {
    checkout.initializeCheckout();
}); 