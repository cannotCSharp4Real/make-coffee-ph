// Function to format price to PHP currency
const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(price);
};

// Function to create HTML for a single product
const createProductHTML = (product) => {
    const isFood = product.type === 'food';
    
    let priceHTML = '';
    if (isFood) {
        priceHTML = `<div class="size-variant">
            <span>Price:</span>
            <span>${formatPrice(product.price)}</span>
        </div>`;
    } else {
        priceHTML = product.sizeVariants.map(variant => `
            <div class="size-variant">
                <span>${variant.size.charAt(0).toUpperCase() + variant.size.slice(1)}:</span>
                <span>${formatPrice(variant.price)}</span>
            </div>
        `).join('');
    }

    let addOnsHTML = '';
    if (product.addOns && product.addOns.length > 0) {
        addOnsHTML = `
            <div class="add-ons">
                <h4>Add-ons:</h4>
                ${product.addOns.map(addon => `
                    <div class="add-on-item">
                        <span>${addon.name}</span>
                        <span>${formatPrice(addon.price)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    return `
        <div class="menu-item" data-type="${product.type}" data-category="${product.category}">
            <div class="menu-item-image">
                <!-- Replace with actual image when available -->
                ${product.name}
            </div>
            <div class="menu-item-content">
                <div class="menu-item-header">
                    <h3 class="menu-item-title">${product.name}</h3>
                    <span class="menu-item-category">${product.category.replace('-', ' ')}</span>
                </div>
                <div class="menu-item-prices">
                    ${priceHTML}
                </div>
                ${addOnsHTML}
            </div>
        </div>
    `;
};

// Function to fetch and display products
const fetchAndDisplayProducts = async () => {
    const menuGrid = document.getElementById('menuGrid');
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        
        if (products.length === 0) {
            menuGrid.innerHTML = '<div class="no-results">No products available</div>';
            return;
        }

        menuGrid.innerHTML = products
            .filter(product => product.available)
            .map(product => createProductHTML(product))
            .join('');
    } catch (error) {
        console.error('Error fetching products:', error);
        menuGrid.innerHTML = '<div class="no-results">Error loading products. Please try again later.</div>';
    }
};

// Filter functionality
const handleFilter = (type) => {
    const menuItems = document.querySelectorAll('.menu-item');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    // Update active button
    filterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    // Show/hide menu items based on filter
    menuItems.forEach(item => {
        if (type === 'all' || item.dataset.type === type) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
};

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initial load of products
    fetchAndDisplayProducts();

    // Add click handlers for filter buttons
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', () => handleFilter(button.dataset.type));
    });
});

// Set up real-time updates using WebSocket or Server-Sent Events
// Note: This requires WebSocket or SSE implementation on the server side
const setupRealtimeUpdates = () => {
    // Using Server-Sent Events (SSE) for real-time updates
    const eventSource = new EventSource('/api/products/events');

    eventSource.onmessage = (event) => {
        // Refresh products when a change is detected
        fetchAndDisplayProducts();
    };

    eventSource.onerror = (error) => {
        console.error('Error in SSE connection:', error);
        eventSource.close();
        // Try to reconnect after 5 seconds
        setTimeout(setupRealtimeUpdates, 5000);
    };
};

// Start real-time updates
setupRealtimeUpdates();
