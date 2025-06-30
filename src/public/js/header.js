// Function to check authentication status and update header
function updateHeaderState() {
    const token = localStorage.getItem('token');
    const authButtons = document.getElementById('authButtons');
    const userButtons = document.getElementById('userButtons');
    
    if (token) {
        // Hide auth buttons and show user buttons
        authButtons.style.display = 'none';
        userButtons.style.display = 'flex';
    } else {
        // Show auth buttons and hide user buttons
        authButtons.style.display = 'flex';
        userButtons.style.display = 'none';
    }
}

// Toggle profile dropdown
function setupProfileDropdown() {
    const profileButton = document.getElementById('profileButton');
    const profileDropdown = document.getElementById('profileDropdown');
    
    profileButton.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('show');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!profileDropdown.contains(e.target)) {
            profileDropdown.classList.remove('show');
        }
    });
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('token');
    window.location.reload();
}

// View profile function
async function viewProfile() {
    // Hide the profile dropdown
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileDropdown) {
        profileDropdown.classList.remove('show');
    }

    // Show the profile modal
    const profileModal = document.getElementById('profileModal');
    if (profileModal) {
        profileModal.style.display = 'block';
        await loadUserProfile(); // This function is defined in profile.js
    }
}

// View orders function
function viewOrders() {
    // Hide the profile dropdown
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileDropdown) {
        profileDropdown.classList.remove('show');
    }

    // Show the orders modal
    const orderModal = document.getElementById('orderHistoryModal');
    if (orderModal) {
        orderModal.style.display = 'block';
        loadOrderHistory(); // This function is defined in orders.js
    }
}

// Cart button click handler
function setupCartButton() {
    const cartButton = document.getElementById('cartButton');
    cartButton.addEventListener('click', () => {
        window.location.href = '/cart.html';
    });
}

// Initialize header functionality
document.addEventListener('DOMContentLoaded', () => {
    updateHeaderState();
    setupProfileDropdown();
    setupCartButton();
});
