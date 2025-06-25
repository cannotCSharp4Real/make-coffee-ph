// Cart state management
let cartState = {
    items: [],
    totalAmount: 0
};

// Function to add item to cart
async function addToCart(productId, productName, price, type, size = null, addOns = []) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            openModal('loginModal');
            return;
        }

        // Create request body based on product type
        const requestBody = {
            productId,
            quantity: 1,
            addOns: []
        };

        // Add size for drinks
        if (type === 'drink' && size) {
            requestBody.size = size;
        }

        const response = await fetch('/api/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to add item to cart');
        }

        const cart = await response.json();
        updateCartState(cart);
        showNotification(`Added ${productName} to cart!`);
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification(error.message || 'Failed to add item to cart', 'error');
    }
}

// Function to update cart item quantity
async function updateCartItemQuantity(itemId, quantity) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/cart/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ itemId, quantity })
        });

        if (!response.ok) {
            throw new Error('Failed to update cart');
        }

        const cart = await response.json();
        updateCartState(cart);
    } catch (error) {
        console.error('Error updating cart:', error);
        showNotification('Failed to update cart', 'error');
    }
}

// Function to remove item from cart
async function removeFromCart(itemId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/cart/remove/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to remove item from cart');
        }

        const cart = await response.json();
        updateCartState(cart);
        showNotification('Item removed from cart');
    } catch (error) {
        console.error('Error removing from cart:', error);
        showNotification('Failed to remove item', 'error');
    }
}

// Function to fetch and update cart
async function fetchCart() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/cart', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch cart');
        }

        const cart = await response.json();
        updateCartState(cart);
    } catch (error) {
        console.error('Error fetching cart:', error);
    }
}

// Function to update cart state and UI
function updateCartState(cart) {
    cartState = cart;
    updateCartUI();
}

// Function to update cart UI
function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        const itemCount = cartState.items.reduce((total, item) => total + item.quantity, 0);
        cartCount.textContent = itemCount;
    }
}

// Function to show notification
function showNotification(message, type = 'success') {
    // Remove existing notification if any
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize cart when page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchCart();
});
