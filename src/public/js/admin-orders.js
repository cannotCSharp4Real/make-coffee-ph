let socket;
let currentOrders = [];

// Add this CSS to your styles.css file
const style = document.createElement('style');
style.textContent = `
.order-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #ff4081;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    display: none;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
}

.order-count-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background-color: #ff4081;
    color: white;
    border-radius: 50%;
    padding: 2px 6px;
    font-size: 12px;
    min-width: 20px;
    text-align: center;
}

@keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
}
`;
document.head.appendChild(style);

// Add notification counter
let pendingOrdersCount = 0;

// Initialize WebSocket connection
function initializeWebSocket() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token found for WebSocket connection');
        return;
    }

    // Close existing connection if any
    if (socket) {
        socket.close();
    }

    socket = new WebSocket(`ws://${window.location.hostname}:3000?token=${token}`);

    socket.onopen = function() {
        console.log('WebSocket connection established');
        loadOrders(); // Load initial orders
    };

    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        if (data.type === 'newOrder') {
            pendingOrdersCount++;
            updateOrdersBadge();
            showNotification('New order received!');
            playNotificationSound();
            loadOrders(); // Refresh the orders list
        }
    };

    socket.onerror = function(error) {
        console.error('WebSocket error:', error);
    };

    socket.onclose = function() {
        console.log('WebSocket connection closed. Attempting to reconnect...');
        setTimeout(initializeWebSocket, 5000);
    };
}

// Show notification
function showNotification(message) {
    const notification = document.getElementById('notification');
    if (!notification) {
        console.error('Notification element not found');
        return;
    }

    notification.textContent = message;
    notification.style.display = 'block';
    
    playNotificationSound();

    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

// Load orders
async function loadOrders() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/orders/all', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load orders');
        }

        const orders = await response.json();
        console.log('Loaded orders:', orders); // Debug log
        currentOrders = orders;
        displayOrders(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
        showNotification('Failed to load orders');
    }
}

// Display orders
function displayOrders(orders) {
    const ordersList = document.getElementById('ordersList');
    const statusFilter = document.getElementById('statusFilter').value;
    
    console.log('Status filter:', statusFilter); // Debug log
    console.log('Orders before filtering:', orders.length); // Debug log

    const filteredOrders = statusFilter === 'all' 
        ? orders 
        : orders.filter(order => order.status === statusFilter);

    console.log('Filtered orders:', filteredOrders.length); // Debug log

    if (filteredOrders.length === 0) {
        ordersList.innerHTML = '<p class="no-orders">No orders found</p>';
        return;
    }

    ordersList.innerHTML = filteredOrders.map(order => `
        <div class="order-card" data-order-id="${order._id}">
            <div class="order-header">
                <div>
                    <h3>Order #${order.orderNumber}</h3>
                    <p>Placed: ${new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <select 
                    class="status-select" 
                    onchange="updateOrderStatus('${order._id}', this.value)"
                    ${order.status === 'cancelled' ? 'disabled' : ''}
                >
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                    <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Ready</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </div>

            <div class="order-details">
                <p>Customer: ${order.user?.name || 'N/A'}</p>
                <p>Delivery Method: ${order.deliveryMethod}</p>
                ${order.deliveryAddress ? `<p>Delivery Address: ${order.deliveryAddress}</p>` : ''}
            </div>

            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-item">
                        <span>${item.product?.name || 'Unknown Product'} x ${item.quantity}</span>
                        <span>${item.size || 'N/A'}</span>
                        <span>₱${item.totalPrice.toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>

            <div class="order-footer">
                <div class="order-total">
                    <p>Subtotal: ₱${order.totalAmount.toFixed(2)}</p>
                    <p>Delivery Fee: ₱${order.deliveryFee.toFixed(2)}</p>
                    <p><strong>Total: ₱${(order.totalAmount + order.deliveryFee).toFixed(2)}</strong></p>
                </div>
                <div class="status-badge status-${order.status}">
                    ${order.status.toUpperCase()}
                </div>
            </div>
        </div>
    `).join('');
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            throw new Error('Failed to update order status');
        }

        const updatedOrder = await response.json();
        console.log('Order status updated:', updatedOrder); // Debug log

        showNotification('Order status updated successfully');
        
        // Refresh the orders list
        loadOrders();
    } catch (error) {
        console.error('Error updating order status:', error);
        showNotification('Failed to update order status');
    }
}

// Filter orders
function filterOrders() {
    const statusFilter = document.getElementById('statusFilter').value;
    console.log('Filtering orders by status:', statusFilter); // Debug log
    displayOrders(currentOrders);
}

// Play notification sound
function playNotificationSound() {
    const audio = document.getElementById('notificationSound');
    if (!audio) {
        console.error('Audio element not found');
        return;
    }

    // Reset the audio to the beginning
    audio.currentTime = 0;
    
    // Play the sound
    audio.play().catch(error => {
        console.error('Error playing notification sound:', error);
    });
}

// Update the orders badge
function updateOrdersBadge() {
    const badge = document.querySelector('.order-count-badge');
    if (badge) {
        badge.textContent = pendingOrdersCount;
        badge.style.display = pendingOrdersCount > 0 ? 'block' : 'none';
    }
}

// Add this to initialize everything when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize WebSocket connection
    initializeWebSocket();

    // Load initial orders
    loadOrders();

    // Set up auto-refresh every 30 seconds as a backup
    setInterval(loadOrders, 30000);
}); 