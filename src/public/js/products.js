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
        // Use sizeVariants instead of variants
        priceHTML = product.sizeVariants.map(variant => `
            <div class="size-variant">
                <span>${variant.size.charAt(0).toUpperCase() + variant.size.slice(1)}:</span>
                <span>${formatPrice(variant.price)}</span>
            </div>
        `).join('');
    }

    // Add-ons section
    let addOnsHTML = '';
    if (product.addOns && product.addOns.length > 0) {
        addOnsHTML = `
            <div class="add-ons">
                <h4>Add-ons:</h4>
                ${product.addOns.map(addon => `
                    <div class="add-on-item">
                        <label class="checkbox-label">
                            <input type="checkbox" 
                                   name="addons-${product._id}" 
                                   data-name="${addon.name}"
                                   data-price="${addon.price}"
                                   ${!addon.available ? 'disabled' : ''}>
                            <span>${addon.name} (${formatPrice(addon.price)})</span>
                        </label>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Add to cart button/section
    let addToCartButton = '';
    if (isFood) {
        addToCartButton = `
            <button class="add-to-cart-btn" onclick="addToCart('${product._id}', '${product.name}', ${product.price}, 'food')">
                Add to Cart
            </button>
        `;
    } else {
        // For drinks, show size selector
        const sizeOptions = product.sizeVariants.map(variant => `
            <option value="${variant.size}" data-price="${variant.price}">
                ${variant.size.charAt(0).toUpperCase() + variant.size.slice(1)} - ${formatPrice(variant.price)}
            </option>
        `).join('');

        addToCartButton = `
            <div class="drink-options">
                <select class="size-select" id="size-${product._id}">
                    ${sizeOptions}
                </select>
                <button class="add-to-cart-btn" onclick="handleAddDrinkToCart('${product._id}', '${product.name}')">
                    Add to Cart
                </button>
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
            <div class="menu-item-actions">
                ${addToCartButton}
            </div>
        </div>
    `;
};

// Function to fetch and display products
const fetchAndDisplayProducts = async () => {
    const menuGrid = document.getElementById('menuGrid');
    try {
        const response = await fetch('/api/products');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const products = await response.json();
        
        if (!Array.isArray(products) || products.length === 0) {
            menuGrid.innerHTML = '<div class="no-results">No products available</div>';
            return;
        }

        menuGrid.innerHTML = products
            .filter(product => product.available)
            .map(product => createProductHTML(product))
            .join('');
    } catch (error) {
        console.error('Error fetching products:', error);
        menuGrid.innerHTML = `
            <div class="error-message">
                <p>Error loading products. Please try again later.</p>
                <button onclick="retryLoadProducts()" class="retry-button">Retry</button>
            </div>
        `;
    }
};

// Add retry function
function retryLoadProducts() {
    fetchAndDisplayProducts();
}

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
    // Only set up SSE if we're on a page that needs real-time updates
    if (!document.getElementById('menuGrid')) {
        return; // Exit if we're not on a page with menu items
    }

    if (typeof EventSource === 'undefined') {
        console.warn('SSE not supported in this browser');
        return;
    }

    let retryCount = 0;
    const maxRetries = 3;

    const connect = () => {
        try {
            const eventSource = new EventSource('/api/products/events');

            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'productUpdate') {
                    fetchAndDisplayProducts();
                }
            };

            eventSource.onerror = () => {
                eventSource.close();
                retryCount++;
                
                // Only retry a few times, then give up silently
                if (retryCount < maxRetries) {
                    setTimeout(connect, 5000);
                }
            };

            // Clean up on page unload
            window.addEventListener('beforeunload', () => {
                eventSource.close();
            });
        } catch (error) {
            // Silently fail after logging
            console.warn('SSE setup failed, real-time updates disabled');
        }
    };

    connect();
};

// Start real-time updates
setupRealtimeUpdates();

// Function to handle adding drinks to cart
function handleAddDrinkToCart(productId, productName) {
    const sizeSelect = document.getElementById(`size-${productId}`);
    const size = sizeSelect.value;
    const price = parseFloat(sizeSelect.selectedOptions[0].dataset.price);
    
    // Get selected add-ons
    const selectedAddOns = Array.from(document.querySelectorAll(`input[name="addons-${productId}"]:checked`))
        .map(checkbox => ({
            name: checkbox.dataset.name,
            price: parseFloat(checkbox.dataset.price)
        }));
    
    addToCart(productId, productName, price, 'drink', size, selectedAddOns);
}
