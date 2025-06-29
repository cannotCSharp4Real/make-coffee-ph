// Cart page specific functionality
let currentCart = null;
const DELIVERY_FEE = 50; // PHP 50 delivery fee

// Format price to PHP currency
function formatPrice(price) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(price);
}

// Create HTML for a cart item
function createCartItemHTML(item) {
    const variant = item.size ? `Size: ${item.size}` : '';
    const addOns = item.addOns && item.addOns.length > 0 
        ? `Add-ons: ${item.addOns.map(addon => addon.name).join(', ')}` 
        : '';

    return `
        <div class="cart-item" data-item-id="${item._id}">
            <div class="item-details">
                <span class="item-name">${item.product.name}</span>
                ${variant ? `<span class="item-variant">${variant}</span>` : ''}
                ${addOns ? `<span class="item-variant">${addOns}</span>` : ''}
            </div>
            <div class="item-price">${formatPrice(item.totalPrice / item.quantity)}</div>
            <div class="quantity-control">
                <button class="quantity-btn" onclick="updateQuantity('${item._id}', ${item.quantity - 1})">-</button>
                <input type="number" class="quantity-input" value="${item.quantity}" 
                    min="1" max="99" onchange="updateQuantity('${item._id}', this.value)">
                <button class="quantity-btn" onclick="updateQuantity('${item._id}', ${item.quantity + 1})">+</button>
            </div>
            <div class="item-total">${formatPrice(item.totalPrice)}</div>
            <button class="remove-btn" onclick="removeItem('${item._id}')">✕</button>
        </div>
    `;
}

// Load and display cart
async function loadCart() {
    const cartContent = document.getElementById('cartContent');
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/';
            return;
        }

        const response = await fetch('/api/cart', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch cart');
        }

        currentCart = await response.json();

        if (!currentCart.items || currentCart.items.length === 0) {
            const template = document.getElementById('emptyCartTemplate');
            cartContent.innerHTML = template.innerHTML;
            return;
        }

        const template = document.getElementById('cartTemplate');
        cartContent.innerHTML = template.innerHTML;

        const cartItemsContainer = cartContent.querySelector('.cart-items');
        cartItemsContainer.innerHTML = currentCart.items.map(item => createCartItemHTML(item)).join('');

        updateSummary();
        setupDeliveryMethodListener();
    } catch (error) {
        console.error('Error loading cart:', error);
        cartContent.innerHTML = '<div class="error">Failed to load cart. Please try again later.</div>';
    }
}

// Update quantity of an item
async function updateQuantity(itemId, newQuantity) {
    try {
        newQuantity = parseInt(newQuantity);
        if (newQuantity < 1) {
            await removeItem(itemId);
            return;
        }

        const token = localStorage.getItem('token');
        const response = await fetch('/api/cart/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ itemId, quantity: newQuantity })
        });

        if (!response.ok) {
            throw new Error('Failed to update quantity');
        }

        currentCart = await response.json();
        await loadCart(); // Reload cart to update all totals
    } catch (error) {
        console.error('Error updating quantity:', error);
        showNotification('Failed to update quantity', 'error');
    }
}

// Remove item from cart
async function removeItem(itemId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/cart/remove/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to remove item');
        }

        currentCart = await response.json();
        await loadCart(); // Reload cart
    } catch (error) {
        console.error('Error removing item:', error);
        showNotification('Failed to remove item', 'error');
    }
}

// Update summary calculations
function updateSummary() {
    const subtotalElement = document.querySelector('.subtotal');
    const deliveryFeeElement = document.querySelector('.delivery-fee');
    const totalElement = document.querySelector('.total');
    const deliveryMethod = document.querySelector('input[name="deliveryMethod"]:checked').value;

    const subtotal = currentCart.totalAmount;
    const deliveryFee = deliveryMethod === 'delivery' ? DELIVERY_FEE : 0;
    const total = subtotal + deliveryFee;

    subtotalElement.textContent = formatPrice(subtotal);
    deliveryFeeElement.textContent = formatPrice(deliveryFee);
    totalElement.textContent = formatPrice(total);
}

// Setup delivery method change listener
function setupDeliveryMethodListener() {
    const deliveryOptions = document.querySelectorAll('input[name="deliveryMethod"]');
    const deliveryAddressGroup = document.getElementById('deliveryAddressGroup');

    deliveryOptions.forEach(option => {
        option.addEventListener('change', (e) => {
            deliveryAddressGroup.style.display = e.target.value === 'delivery' ? 'block' : 'none';
            updateSummary();
        });
    });

    // Initial state
    deliveryAddressGroup.style.display = 
        document.querySelector('input[name="deliveryMethod"]:checked').value === 'delivery' 
            ? 'block' 
            : 'none';
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Place order
async function placeOrder() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Please log in to place an order', 'error');
            window.location.href = '/';
            return;
        }

        // Disable the place order button
        const placeOrderButton = document.querySelector('.submit-order');
        placeOrderButton.disabled = true;

        // Get delivery method and address
        const deliveryMethod = document.querySelector('input[name="deliveryMethod"]:checked')?.value;
        if (!deliveryMethod) {
            showNotification('Please select a delivery method', 'error');
            placeOrderButton.disabled = false;
            return;
        }

        const deliveryAddress = document.getElementById('deliveryAddress')?.value || '';

        if (deliveryMethod === 'delivery' && !deliveryAddress.trim()) {
            showNotification('Please enter a delivery address', 'error');
            placeOrderButton.disabled = false;
            return;
        }

        const orderData = {
            deliveryMethod,
            deliveryAddress: deliveryMethod === 'delivery' ? deliveryAddress : ''
        };

        console.log('Sending order request with:', orderData);

        // Place the order
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });

        const data = await response.json();
        console.log('Server response:', data);

        if (!response.ok) {
            throw new Error(data.message || data.error || 'Failed to place order');
        }

        // Show success and handle order confirmation
        showOrderConfirmation(data.order);
        startCancellationCountdown(data.order._id, data.cancellationWindow || 10);

    } catch (error) {
        console.error('Error placing order:', error);
        showNotification(error.message || 'Failed to place order', 'error');
        const placeOrderButton = document.querySelector('.submit-order');
        if (placeOrderButton) {
            placeOrderButton.disabled = false;
        }
    }
}

// Show order confirmation
function showOrderConfirmation(order) {
    const confirmationHTML = `
        <div class="order-confirmation">
            <h2>Order Placed Successfully!</h2>
            <p>Order ID: ${order._id}</p>
            <p>Total Amount: ${formatPrice(order.totalAmount + order.deliveryFee)}</p>
            <p>Status: ${order.status}</p>
            <div class="cancellation-timer">
                <p>You can cancel this order within <span id="countdown">10</span> seconds</p>
                <button onclick="cancelOrder('${order._id}')" class="cancel-order-btn">Cancel Order</button>
            </div>
            <button onclick="closeOrderConfirmation()" class="close-confirmation-btn">Close</button>
        </div>
    `;

    const confirmationContainer = document.createElement('div');
    confirmationContainer.className = 'order-confirmation-overlay';
    confirmationContainer.innerHTML = confirmationHTML;
    document.body.appendChild(confirmationContainer);
}

// Start cancellation countdown
function startCancellationCountdown(orderId, seconds) {
    const countdownElement = document.getElementById('countdown');
    let timeLeft = seconds;

    const countdownInterval = setInterval(() => {
        timeLeft--;
        if (countdownElement) {
            countdownElement.textContent = timeLeft;
        }

        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            const cancelBtn = document.querySelector('.cancel-order-btn');
            if (cancelBtn) {
                cancelBtn.disabled = true;
                cancelBtn.textContent = 'Order Confirmed';
            }
        }
    }, 1000);
}

// Cancel order
async function cancelOrder(orderId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/orders/${orderId}/cancel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to cancel order');
        }

        showNotification('Order cancelled successfully');
        closeOrderConfirmation();
        window.location.href = '/'; // Redirect to home page
    } catch (error) {
        console.error('Error cancelling order:', error);
        showNotification(error.message || 'Failed to cancel order', 'error');
    }
}

// Close order confirmation
function closeOrderConfirmation() {
    const confirmationOverlay = document.querySelector('.order-confirmation-overlay');
    if (confirmationOverlay) {
        confirmationOverlay.remove();
    }
    window.location.href = '/'; // Redirect to home page
}

// Add this to your existing cart page JavaScript
function addCheckoutButton() {
    const checkoutBtn = document.createElement('button');
    checkoutBtn.className = 'btn-primary';
    checkoutBtn.textContent = 'Proceed to Checkout';
    checkoutBtn.onclick = () => {
        window.location.href = '/orders/checkout';
    };
    
    document.querySelector('.cart-container').appendChild(checkoutBtn);
}

// Initialize page
document.addEventListener('DOMContentLoaded', loadCart);
