// Product Management Functions
let currentProducts = [];

// Load and display products
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

        currentProducts = await response.json();
        displayProducts();
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Failed to load products', 'error');
    }
}

// Display products in grid
function displayProducts() {
    const productList = document.getElementById('productList');
    const typeFilter = document.getElementById('productTypeFilter').value;
    const categoryFilter = document.getElementById('productCategoryFilter').value;

    const filteredProducts = currentProducts.filter(product => {
        if (typeFilter !== 'all' && product.type !== typeFilter) return false;
        if (categoryFilter !== 'all' && product.category !== categoryFilter) return false;
        return true;
    });

    productList.innerHTML = filteredProducts.map(product => `
        <div class="product-card">
            <div class="product-header">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-actions">
                    <button class="button button-secondary" onclick="editProduct('${product._id}')">Edit</button>
                    <button class="button button-danger" onclick="deleteProduct('${product._id}')">Delete</button>
                </div>
            </div>
            <div class="product-details">
                <div>Type: ${product.type}</div>
                <div>Category: ${product.category.replace('-', ' ')}</div>
                <div>Status: ${product.available ? 'Available' : 'Not Available'}</div>
                <div class="price-list">
                    ${product.type === 'food' 
                        ? `Price: ${formatPrice(product.price)}`
                        : `Sizes:<br>${product.sizeVariants.map(v => 
                            `${v.size}: ${formatPrice(v.price)}`
                        ).join('<br>')}`
                    }
                </div>
                ${product.addOns && product.addOns.length > 0 
                    ? `<div class="price-list">
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
}

// Open product modal
function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const modalTitle = document.getElementById('modalTitle');

    form.reset();
    document.getElementById('productId').value = '';
    modalTitle.textContent = 'Add New Product';

    if (productId) {
        const product = currentProducts.find(p => p._id === productId);
        if (product) {
            modalTitle.textContent = 'Edit Product';
            fillProductForm(product);
        }
    }

    modal.style.display = 'block';
    handleTypeChange(); // Update form fields based on type
}

// Fill product form with data
function fillProductForm(product) {
    document.getElementById('productId').value = product._id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productType').value = product.type;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productAvailable').checked = product.available;

    if (product.type === 'food') {
        document.getElementById('productPrice').value = product.price;
    } else {
        product.sizeVariants.forEach(variant => {
            document.getElementById(`${variant.size}Price`).value = variant.price;
        });
        
        // Clear and rebuild add-ons list
        const addOnsList = document.getElementById('addOnsList');
        addOnsList.innerHTML = '';
        if (product.addOns) {
            product.addOns.forEach(addon => {
                addAddon(addon.name, addon.price);
            });
        }
    }

    handleTypeChange();
}

// Close product modal
function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
}

// Handle product type change
function handleTypeChange() {
    const type = document.getElementById('productType').value;
    const foodPriceSection = document.getElementById('foodPriceSection');
    const drinkPriceSection = document.getElementById('drinkPriceSection');
    const addOnsSection = document.getElementById('addOnsSection');
    
    // Update category options based on type
    updateCategoryOptions(type);

    if (type === 'food') {
        foodPriceSection.style.display = 'block';
        drinkPriceSection.style.display = 'none';
        addOnsSection.style.display = 'none';
    } else {
        foodPriceSection.style.display = 'none';
        drinkPriceSection.style.display = 'block';
        addOnsSection.style.display = 'block';
    }
}

// Update category options based on type
function updateCategoryOptions(type) {
    const categorySelect = document.getElementById('productCategory');
    const foodCategories = ['pastries', 'sandwiches', 'desserts', 'snacks'];
    const drinkCategories = ['hot-coffee', 'iced-coffee', 'tea', 'frappe', 'smoothie'];
    
    const categories = type === 'food' ? foodCategories : drinkCategories;
    
    categorySelect.innerHTML = categories.map(category => `
        <option value="${category}">${category.replace('-', ' ')}</option>
    `).join('');
}

// Add new add-on input fields
function addAddon(name = '', price = '') {
    const addOnsList = document.getElementById('addOnsList');
    const addonDiv = document.createElement('div');
    addonDiv.className = 'addon-item';
    addonDiv.innerHTML = `
        <input type="text" placeholder="Add-on name" value="${name}" required>
        <input type="number" placeholder="Price" min="0" step="0.01" value="${price}" required>
        <button type="button" class="button button-danger" onclick="this.parentElement.remove()">Remove</button>
    `;
    addOnsList.appendChild(addonDiv);
}

// Handle product form submission
async function handleProductSubmit(event) {
    event.preventDefault();
    
    try {
        const productId = document.getElementById('productId').value;
        const type = document.getElementById('productType').value;
        
        const productData = {
            name: document.getElementById('productName').value.trim(),
            type: type,
            category: document.getElementById('productCategory').value,
            available: document.getElementById('productAvailable').checked
        };

        // Validate required fields
        if (!productData.name) {
            throw new Error('Product name is required');
        }

        if (type === 'food') {
            const price = parseFloat(document.getElementById('productPrice').value);
            if (isNaN(price) || price <= 0) {
                throw new Error('Please enter a valid price');
            }
            productData.price = price;
        } else {
            // Validate and add size variants
            const sizeVariants = ['small', 'medium', 'large'].map(size => {
                const price = parseFloat(document.getElementById(`${size}Price`).value);
                if (isNaN(price) || price <= 0) {
                    throw new Error(`Please enter a valid price for ${size} size`);
                }
                return { size, price };
            });
            productData.sizeVariants = sizeVariants;

            // Add add-ons if any
            const addOns = Array.from(document.querySelectorAll('.addon-item')).map(item => {
                const name = item.querySelector('input[type="text"]').value.trim();
                const price = parseFloat(item.querySelector('input[type="number"]').value);
                
                if (!name || isNaN(price) || price < 0) {
                    throw new Error('Please fill in all add-on fields correctly');
                }
                
                return { name, price };
            });
            
            if (addOns.length > 0) {
                productData.addOns = addOns;
            }
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
            const error = await response.json();
            throw new Error(error.message || 'Failed to save product');
        }

        await loadProducts(); // Reload the product list
        closeProductModal();
        showNotification(productId ? 'Product updated successfully' : 'Product created successfully');
    } catch (error) {
        showNotification(error.message, 'error');
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
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete product');
        }

        await loadProducts(); // Reload the product list
        showNotification('Product deleted successfully');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Edit product
function editProduct(productId) {
    openProductModal(productId);
}

// Filter products
function filterProducts() {
    displayProducts();
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

// Initialize product management
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});
