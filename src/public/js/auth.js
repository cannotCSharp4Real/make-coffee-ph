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

        // Store the token
        localStorage.setItem('token', data.token);
        
        // Close modal and redirect to dashboard or refresh page
        closeModal('registerModal');
        window.location.reload();
        
    } catch (error) {
        errorDiv.textContent = error.message;
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

        // Store the token
        localStorage.setItem('token', data.token);
        
        // Close modal
        closeModal('loginModal');

        // Check user role and redirect accordingly
        if (data.user.role === 'admin') {
            window.location.href = '/admin.html';
        } else {
            window.location.reload();
        }
        
    } catch (error) {
        errorDiv.textContent = error.message;
    }
}
