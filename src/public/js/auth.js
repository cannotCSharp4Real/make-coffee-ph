// Handle modal operations
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Handle registration
async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const errorDiv = document.getElementById('registerError');
    
    try {
        // Validate input
        if (!form.email.value || !form.password.value) {
            errorDiv.textContent = 'Email and password are required';
            return;
        }

        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: form.username.value,
                email: form.email.value,
                password: form.password.value,
            }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        updateAuthState(data);
        closeModal('registerModal');
        
    } catch (error) {
        errorDiv.style.color = 'red';
        errorDiv.textContent = error.message;
        console.error('Registration error:', error);
    }
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const errorDiv = document.getElementById('loginError');
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: form.email.value,
                password: form.password.value,
            }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        updateAuthState(data);
        closeModal('loginModal');

        // For admin users, redirect to admin page
        if (data.user.role === 'admin') {
            window.location.href = '/admin.html';
        } else {
            window.location.reload();
        }
        
    } catch (error) {
        errorDiv.textContent = error.message;
    }
}

// Add to src/public/js/auth.js after successful login/register
function updateAuthState(userData) {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('userRole', userData.user.role);
    updateHeaderState(); // Update header state after login/register
}
