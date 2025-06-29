let pollingInterval;
let lastOrderStatuses = new Map(); // Store last known status of each order

// Start polling for order updates
function startOrderPolling() {
    // Initial check
    checkOrderUpdates();
    
    // Poll every 10 seconds
    pollingInterval = setInterval(checkOrderUpdates, 10000);
}

// Stop polling
function stopOrderPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

// Check for order updates
async function checkOrderUpdates() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/orders/my-orders', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch orders');
        }

        const orders = await response.json();
        orders.forEach(order => {
            const lastStatus = lastOrderStatuses.get(order._id);
            
            // If we have a previous status and it's different from current
            if (lastStatus && lastStatus !== order.status) {
                // Play notification sound
                playNotificationSound();
                
                // Show status notification
                showStatusNotification(`Your order #${order.orderNumber} status has been updated to ${order.status.toUpperCase()}`);
                
                // Update the order display
                updateOrderDisplay(order._id, order.status);
            }
            
            // Update the stored status
            lastOrderStatuses.set(order._id, order.status);
        });

        // Update the display if we're on the orders modal
        const orderModal = document.getElementById('orderHistoryModal');
        if (orderModal && orderModal.style.display === 'block') {
            displayOrderHistory(orders);
        }
    } catch (error) {
        console.error('Error checking order updates:', error);
    }
}

function playNotificationSound() {
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(err => console.log('Error playing sound:', err));
}

function showStatusNotification(message) {
    Swal.fire({
        title: 'Order Update',
        text: message,
        icon: 'info',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true
    });
}

function updateOrderDisplay(orderId, newStatus) {
    const orderElement = document.querySelector(`[data-order-id="${orderId}"]`);
    if (orderElement) {
        // Update status text
        const statusElement = orderElement.querySelector('.status');
        if (statusElement) {
            statusElement.textContent = newStatus.toUpperCase();
            statusElement.className = `status ${newStatus.toLowerCase()}`;
        }
        
        // Update cancel button visibility
        const actionDiv = orderElement.querySelector('.order-actions');
        if (actionDiv) {
            if (newStatus === 'pending') {
                actionDiv.innerHTML = `
                    <button onclick="cancelOrder('${orderId}')" class="cancel-btn">Cancel Order</button>
                `;
            } else {
                actionDiv.innerHTML = '';
            }
        }
    }
}

// Load and display order history
async function loadOrderHistory() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        const response = await fetch('/api/orders/my-orders', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch orders');
        }

        const orders = await response.json();
        displayOrderHistory(orders);
    } catch (error) {
        console.error('Error loading order history:', error);
        const orderList = document.getElementById('orderHistoryList');
        if (orderList) {
            orderList.innerHTML = '<div class="error-message">Failed to load orders. Please try again.</div>';
        }
    }
}

function displayOrderHistory(orders) {
    const orderList = document.getElementById('orderHistoryList');
    if (!orderList) return;

    if (!orders || orders.length === 0) {
        orderList.innerHTML = '<div class="no-orders">No orders found</div>';
        return;
    }

    orderList.innerHTML = orders.map(order => `
        <div class="order-card" data-order-id="${order._id}">
            <div class="order-header">
                <h3>Order #${order.orderNumber || order._id}</h3>
                <span class="status ${order.status.toLowerCase()}">${order.status.toUpperCase()}</span>
            </div>
            <div class="order-details">
                <p>Total Amount: PHP ${order.totalAmount.toFixed(2)}</p>
                <p>Delivery Method: ${order.deliveryMethod}</p>
                <p>Created: ${new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-item">
                        <span>${item.product.name}</span>
                        <span>x${item.quantity}</span>
                        <span>PHP ${item.totalPrice.toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
            ${order.status === 'pending' ? `
                <div class="order-actions">
                    <button onclick="cancelOrder('${order._id}')" class="cancel-btn">Cancel Order</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

async function cancelOrder(orderId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/orders/${orderId}/cancel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to cancel order');
        }

        // Refresh the order history display
        loadOrderHistory();
        
        // Show success notification
        showStatusNotification('Order cancelled successfully');
    } catch (error) {
        console.error('Error cancelling order:', error);
        showStatusNotification('Failed to cancel order');
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        startOrderPolling();
    }
});

// Clean up when leaving the page
window.addEventListener('beforeunload', () => {
    stopOrderPolling();
});