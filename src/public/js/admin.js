// Add at the beginning of the file
let currentTab = 'dashboard'; // Default tab
let lastOrderCount = 0;
let pollingInterval;

// Start polling for new orders
function startOrderPolling() {
    // Initial check
    checkNewOrders();
    
    // Poll every 30 seconds
    pollingInterval = setInterval(checkNewOrders, 10000);
}

// Stop polling
function stopOrderPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
}

// Check for new orders
async function checkNewOrders() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/orders/all?status=pending', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch orders');
        }

        const orders = await response.json();
        const pendingOrderCount = orders.length;

        // Update notification badge
        const badge = document.getElementById('orderNotificationBadge');
        if (pendingOrderCount > 0) {
            badge.style.display = 'inline';
            badge.textContent = pendingOrderCount;

            // If there are new orders since last check
            if (pendingOrderCount > lastOrderCount) {
                // Play notification sound
                const audio = document.getElementById('orderNotificationSound');
                if (audio) {
                    audio.play().catch(err => console.log('Error playing sound:', err));
                }

                // Show notification if not on orders tab
                if (currentTab !== 'orders') {
                    showNotification(`You have ${pendingOrderCount} pending order${pendingOrderCount > 1 ? 's' : ''}`);
                }
            }
        } else {
            badge.style.display = 'none';
        }

        lastOrderCount = pendingOrderCount;

        // If we're on the orders tab, update the list
        if (currentTab === 'orders') {
            loadOrders();
        }
    } catch (error) {
        console.error('Error checking new orders:', error);
    }
}

// Show browser notification
function showNotification(message) {
    // Check if browser supports notifications
    if (!("Notification" in window)) {
        return;
    }

    // Check if permission is granted
    if (Notification.permission === "granted") {
        new Notification("New Order", { body: message });
    }
    // Otherwise, ask for permission
    else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification("New Order", { body: message });
            }
        });
    }
}

// Initialize when document loads
document.addEventListener('DOMContentLoaded', () => {
    // Request notification permission
    if ("Notification" in window) {
        Notification.requestPermission();
    }

    // Start polling
    startOrderPolling();
});

// Clean up when page unloads
window.addEventListener('unload', () => {
    stopOrderPolling();
});

// Format price to PHP currency
function formatPrice(price) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(price);
}

// Show selected section
function showSection(sectionId) {
    currentTab = sectionId; // Update current tab
    
    // If switching to orders tab, clear notification count
    if (sectionId === 'orders') {
        const badge = document.getElementById('orderNotificationBadge');
        if (badge) {
            badge.style.display = 'none';
        }
    }

    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    const section = document.getElementById(`${sectionId}Section`);
    const tab = document.querySelector(`.nav-tab[onclick="showSection('${sectionId}')"]`);
    
    if (section) section.classList.add('active');
    if (tab) tab.classList.add('active');

    // Load section-specific data
    switch(sectionId) {
        case 'orders':
            loadOrders();
            break;
        case 'users':
            loadUsers();
            break;
        case 'reports':
            generateReport();
            break;
        case 'products':
            loadProducts();
            break;
    }
}

// Load orders
async function loadOrders() {
    try {
        const orderList = document.getElementById('orderList');
        if (!orderList) {
            console.error('Order list element not found');
            return;
        }

        const statusFilter = document.getElementById('orderStatusFilter');
        const dateFilter = document.getElementById('orderDateFilter');
        
        const status = statusFilter ? statusFilter.value : 'all';
        const date = dateFilter ? dateFilter.value : '';
        
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/';
            return;
        }

        const response = await fetch(`/api/orders/all?status=${status}&date=${date}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch orders: ${response.status}`);
        }

        const orders = await response.json();
        
        if (orders.length === 0) {
            orderList.innerHTML = '<div class="no-orders">No orders found</div>';
            return;
        }

        orderList.innerHTML = orders.map(order => `
            <div class="order-item">
                <div>#${order.orderNumber || order._id}</div>
                <div>
                    ${order.items.map(item => `
                        ${item.quantity}x ${item.product?.name || 'Unknown Product'}
                    `).join('<br>')}
                </div>
                <div>${formatPrice(order.totalAmount)}</div>
                <div>
                    <select class="status-select" onchange="updateOrderStatus('${order._id}', this.value)">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                        <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Ready</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </div>
                <div>${new Date(order.createdAt).toLocaleString()}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading orders:', error);
        const orderList = document.getElementById('orderList');
        if (orderList) {
            orderList.innerHTML = '<div class="error">Failed to load orders. Please try again.</div>';
        }
    }
}

// Update order status
async function updateOrderStatus(orderId, status) {
    try {
        // Clear notification badge when starting to update status
        const badge = document.getElementById('orderNotificationBadge');
        if (badge) {
            badge.style.display = 'none';
        }
        lastOrderCount = 0; // Reset the counter

        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            throw new Error('Failed to update order status');
        }

        // Reload orders to show updated status
        loadOrders();
    } catch (error) {
        console.error('Error updating order status:', error);
    }
}

// Load users
async function loadUsers() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        const users = await response.json();
        const userList = document.getElementById('userList');
        
        userList.innerHTML = users.map(user => `
            <div class="user-item">
                <div>${user.email}</div>
                <div>
                    <select onchange="updateUserRole('${user._id}', this.value)">
                        <option value="customer" ${user.role === 'customer' ? 'selected' : ''}>Customer</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
                <div>${new Date(user.createdAt).toLocaleDateString()}</div>
                <button onclick="deleteUser('${user._id}')">Delete</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Update user role
async function updateUserRole(userId, role) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ role })
        });

        if (!response.ok) {
            throw new Error('Failed to update user role');
        }

        // Reload users to show updated role
        loadUsers();
    } catch (error) {
        console.error('Error updating user role:', error);
    }
}

// Delete user
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete user');
        }

        // Reload users to show updated list
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
    }
}

// Generate sales report
async function generateReport() {
    try {
        const startDateInput = document.getElementById('reportStartDate');
        const endDateInput = document.getElementById('reportEndDate');
        const reportSummary = document.getElementById('reportSummary');
        const reportDetails = document.getElementById('reportDetails');

        if (!reportSummary || !reportDetails) {
            console.error('Report elements not found');
            return;
        }

        const startDate = startDateInput ? startDateInput.value : '';
        const endDate = endDateInput ? endDateInput.value : '';
        
        if (!startDate || !endDate) {
            reportSummary.innerHTML = '<div class="error">Please select both start and end dates</div>';
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/';
            return;
        }

        const response = await fetch(`/api/orders/sales?startDate=${startDate}&endDate=${endDate}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to generate report: ${response.status}`);
        }

        const report = await response.json();
        
        // Display summary with safe calculations
        reportSummary.innerHTML = `
            <div class="summary-card">
                <h3>Total Sales</h3>
                <div class="value">${formatPrice(report.totalSales || 0)}</div>
            </div>
            <div class="summary-card">
                <h3>Total Orders</h3>
                <div class="value">${report.orderCount || 0}</div>
            </div>
            <div class="summary-card">
                <h3>Average Order Value</h3>
                <div class="value">${formatPrice(report.orderCount ? (report.totalSales / report.orderCount) : 0)}</div>
            </div>
        `;

        // Display daily sales if available
        if (report.dailySales && Object.keys(report.dailySales).length > 0) {
            const dailySalesHtml = Object.entries(report.dailySales)
                .map(([date, amount]) => `
                    <div class="daily-sales-item">
                        <div>${new Date(date).toLocaleDateString()}</div>
                        <div>${formatPrice(amount)}</div>
                    </div>
                `).join('');

            reportDetails.innerHTML = `
                <h3>Daily Sales</h3>
                <div class="daily-sales">${dailySalesHtml}</div>
            `;
        } else {
            reportDetails.innerHTML = '<div class="no-data">No sales data available for the selected period</div>';
        }
    } catch (error) {
        console.error('Error generating report:', error);
        const reportSummary = document.getElementById('reportSummary');
        if (reportSummary) {
            reportSummary.innerHTML = '<div class="error">Failed to generate report. Please try again.</div>';
        }
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}

// Load products
async function loadProducts() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/products', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }

        const products = await response.json();
        const productList = document.getElementById('productList');
        
        productList.innerHTML = products.map(product => `
            <div class="product-card">
                <div class="product-header">
                    <h3 class="product-title">${product.name}</h3>
                    <div class="product-actions">
                        <button onclick="editProduct('${product._id}')">Edit</button>
                        <button onclick="deleteProduct('${product._id}')">Delete</button>
                    </div>
                </div>
                <div class="product-details">
                    <div>Type: ${product.type}</div>
                    <div>Category: ${product.category}</div>
                    <div>Available: ${product.available ? 'Yes' : 'No'}</div>
                    <div class="price-list">
                        ${product.type === 'food' 
                            ? `Price: ${formatPrice(product.price)}`
                            : `Sizes:<br>${product.sizeVariants.map(v => 
                                `${v.size}: ${formatPrice(v.price)}`
                            ).join('<br>')}`
                        }
                    </div>
                    ${product.addOns && product.addOns.length > 0 
                        ? `<div class="addons-list">
                            Add-ons:<br>
                            ${product.addOns.map(addon => 
                                `${addon.name}: ${formatPrice(addon.price)}`
                            ).join('<br>')}
                           </div>`
                        : ''
                    }
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Show product modal
function showProductModal(product = null) {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const modalTitle = document.getElementById('modalTitle');

    modalTitle.textContent = product ? 'Edit Product' : 'Add New Product';
    form.reset();

    if (product) {
        document.getElementById('productId').value = product._id;
        document.getElementById('name').value = product.name;
        document.getElementById('type').value = product.type;
        document.getElementById('category').value = product.category;
        document.getElementById('available').checked = product.available;

        if (product.type === 'food') {
            document.getElementById('price').value = product.price;
        } else {
            product.sizeVariants.forEach(variant => {
                document.getElementById(`${variant.size}Price`).value = variant.price;
            });
        }

        if (product.addOns) {
            const addOnsList = document.getElementById('addOnsList');
            addOnsList.innerHTML = '';
            product.addOns.forEach(addon => {
                addAddonToList(addon.name, addon.price);
            });
        }
    }

    toggleSizeVariants();
    modal.style.display = 'block';
}

// Close product modal
function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
}

// Toggle size variants based on product type
function toggleSizeVariants() {
    const type = document.getElementById('type').value;
    const sizeVariantsGroup = document.getElementById('sizeVariantsGroup');
    const foodPriceGroup = document.getElementById('foodPriceGroup');
    const addOnsGroup = document.getElementById('addOnsGroup');

    if (type === 'drink') {
        sizeVariantsGroup.style.display = 'block';
        foodPriceGroup.style.display = 'none';
        addOnsGroup.style.display = 'block';
    } else {
        sizeVariantsGroup.style.display = 'none';
        foodPriceGroup.style.display = 'block';
        addOnsGroup.style.display = 'none';
    }
}

// Add new add-on input fields
function addNewAddon() {
    addAddonToList('', '');
}

// Add add-on to the list
function addAddonToList(name = '', price = '') {
    const addOnsList = document.getElementById('addOnsList');
    const addonDiv = document.createElement('div');
    addonDiv.className = 'addon-item';
    addonDiv.innerHTML = `
        <input type="text" placeholder="Add-on name" value="${name}" required>
        <input type="number" placeholder="Price" min="0" step="0.01" value="${price}" required>
        <button type="button" onclick="this.parentElement.remove()">Remove</button>
    `;
    addOnsList.appendChild(addonDiv);
}

// Handle product form submission
async function handleProductSubmit(event) {
    event.preventDefault();
    
    try {
        const productId = document.getElementById('productId').value;
        const type = document.getElementById('type').value;
        
        const productData = {
            name: document.getElementById('name').value,
            type: type,
            category: document.getElementById('category').value,
            available: document.getElementById('available').checked
        };

        if (type === 'food') {
            productData.price = parseFloat(document.getElementById('price').value);
        } else {
            productData.sizeVariants = [
                { size: 'small', price: parseFloat(document.getElementById('smallPrice').value) },
                { size: 'medium', price: parseFloat(document.getElementById('mediumPrice').value) },
                { size: 'large', price: parseFloat(document.getElementById('largePrice').value) }
            ];

            // Get add-ons
            productData.addOns = Array.from(document.querySelectorAll('.addon-item')).map(item => ({
                name: item.querySelector('input[type="text"]').value,
                price: parseFloat(item.querySelector('input[type="number"]').value)
            }));
        }

        const token = localStorage.getItem('token');
        const url = productId 
            ? `/api/admin/products/${productId}`
            : '/api/admin/products';
        
        const response = await fetch(url, {
            method: productId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productData)
        });

        if (!response.ok) {
            throw new Error('Failed to save product');
        }

        closeProductModal();
        loadProducts();
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Failed to save product');
    }
}

// Edit product
async function editProduct(productId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/products/${productId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch product');
        }

        const product = await response.json();
        showProductModal(product);
    } catch (error) {
        console.error('Error editing product:', error);
    }
}

// Delete product
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete product');
        }

        loadProducts();
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product');
    }
}

// Check if user is admin when admin page loads
document.addEventListener('DOMContentLoaded', () => {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin') {
        window.location.href = '/'; // Redirect non-admin users to home page
        return;
    }
    // Continue with admin page initialization

    loadOrders();
    loadUsers();
    loadProducts();
});

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    // Show default section
    showSection('dashboard');

    // Add event listeners for date inputs
    const reportStartDate = document.getElementById('reportStartDate');
    const reportEndDate = document.getElementById('reportEndDate');
    if (reportStartDate && reportEndDate) {
        reportStartDate.valueAsDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
        reportEndDate.valueAsDate = new Date();
    }
});