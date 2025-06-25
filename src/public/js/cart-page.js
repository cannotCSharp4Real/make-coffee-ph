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

// Initialize page
document.addEventListener('DOMContentLoaded', loadCart);
