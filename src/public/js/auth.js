// Authentication state management
let isAuthenticated = false;

// Function to check authentication status
function checkAuth() {
    const token = localStorage.getItem('token');
    isAuthenticated = !!token;
    updateUIForAuthState();
}

// Function to update UI based on authentication state
function updateUIForAuthState() {
    const authButtons = document.getElementById('authButtons');
    const userButtons = document.getElementById('userButtons');

    if (isAuthenticated) {
        if (authButtons) authButtons.style.display = 'none';
        if (userButtons) userButtons.style.display = 'flex';
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userButtons) userButtons.style.display = 'none';
    }
}

// Modal management
function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

function openModal(modalId) {
    closeAllModals();
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

// Sign in functionality
async function signIn(event) {
    event.preventDefault();
    
    const email = document.getElementById('signInEmail').value;
    const password = document.getElementById('signInPassword').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to sign in');
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.user.role);
        isAuthenticated = true;
        
        // Close the sign in modal
        closeAllModals();
        
        // Update UI
        updateUIForAuthState();
        
        // Show success notification
        showNotification('Signed in successfully');
        
        // Redirect based on user role
        if (data.user.role === 'admin') {
            window.location.href = '/admin.html';
        } else {
            window.location.href = '/';
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Logout functionality
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    isAuthenticated = false;
    updateUIForAuthState();
    showNotification('Logged out successfully');
    window.location.href = '/';
}

// Register functionality
async function register(event) {
    event.preventDefault();
    
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to register');
        }

        // Show success message
        showNotification('Registration successful! Please sign in.');

        // Close register modal and open sign in modal
        closeAllModals();
        openModal('loginModal');
    } catch (error) {
        showNotification(error.message, 'error');
    }
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

// Initialize auth state when page loads
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    // Add event listeners for modal close buttons
    document.querySelectorAll('.modal .close').forEach(button => {
        button.addEventListener('click', () => {
            closeAllModals();
        });
    });
        
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeAllModals();
    }
    });
});

// Add this function to your auth.js
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (!token) {
        // User is not logged in, just update UI silently
        updateAuthUI(false);
        return;
    }

    // Only make the API call if we have a token
    fetch('/api/auth/profile', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Not authenticated');
        }
        return response.json();
    })
    .then(user => {
        updateAuthUI(true, user);
    })
    .catch(() => {
        // Token is invalid, remove it and update UI
        localStorage.removeItem('token');
        updateAuthUI(false);
    });
}

// Helper function to update UI based on auth state
function updateAuthUI(isAuthenticated, user = null) {
    const authButtons = document.querySelector('.auth-buttons');
    if (!authButtons) return;

    if (isAuthenticated && user) {
        if (user.role === 'admin') {
            authButtons.innerHTML = `
                <div class="dropdown">
                    <button class="button button-secondary dropdown-toggle">Account</button>
                    <div class="dropdown-content">
                        <a href="/profile.html">View Profile</a>
                        <a href="/admin.html">Admin Dashboard</a>
                        <a href="#" onclick="openModal('orderHistoryModal')">Order History</a>
                        <a href="#" onclick="handleLogout()">Logout</a>
                    </div>
                </div>
            `;
        } else {
            authButtons.innerHTML = `
                <div class="dropdown">
                    <button class="button button-secondary dropdown-toggle">Account</button>
                    <div class="dropdown-content">
                        <a href="/profile.html">View Profile</a>
                        <a href="#" onclick="openModal('orderHistoryModal')">Order History</a>
                        <a href="#" onclick="handleLogout()">Logout</a>
                    </div>
                </div>
            `;
        }
    } else {
        authButtons.innerHTML = `
            <button class="button button-secondary" onclick="openModal('loginModal')">Login</button>
            <button class="button button-primary" onclick="openModal('registerModal')">Register</button>
        `;
    }
}