// API Configuration
const API_BASE_URL = 'http://localhost:5000';

// OAuth Configuration
const oauthConfig = {
    google: {
        clientId: '483680590243-74tfi6sjpl8bm749io05drojls7pp84u.apps.googleusercontent.com',
        redirectUri: 'http://127.0.0.1:5500/auth/google/callback',
        scope: 'email profile'
    },
    facebook: {
        appId: '1071074388173850',
        redirectUri: 'http://localhost:5000/auth/facebook/callback',
        scope: 'email,public_profile',
        version: 'v12.0'
    },
    github: {
        clientId: 'YOUR_GITHUB_CLIENT_ID',
        redirectUri: window.location.origin + '/auth/github/callback',
        scope: 'user:email'
    }
};

// Function to check if server is running
async function checkServer() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        return response.ok;
    } catch (error) {
        console.error('Server check failed:', error);
        return false;
    }
}

// Form submission handlers
const loginForm = document.querySelector('.form-box.login form');
const registerForm = document.querySelector('.form-box.register form');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('input[type="email"]').value;
    const password = loginForm.querySelector('input[type="password"]').value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (data.success) {
            // Store user info in localStorage if needed
            localStorage.setItem('user', JSON.stringify(data.user));
            // Redirect to connect.html
            window.location.href = 'connect.html';
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = registerForm.querySelector('input[type="text"]').value;
    const email = registerForm.querySelector('input[type="email"]').value;
    const password = registerForm.querySelector('input[type="password"]').value;
    const confirmPassword = registerForm.querySelectorAll('input[type="password"]')[1].value;

    // Validate form data
    if (!username || !email || !password || !confirmPassword) {
        alert('Please fill in all fields');
        return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    // Check if server is running
    const serverRunning = await checkServer();
    if (!serverRunning) {
        alert('Cannot connect to server. Please make sure the server is running on port 5000');
        return;
    }

    console.log('Sending registration request:', { username, email });

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        });

        console.log('Registration response status:', response.status);
        const data = await response.json();
        console.log('Registration response data:', data);
        
        if (data.success) {
            alert('Registration successful! Please login.');
            // Switch to login form
            container.classList.remove('active');
            container.classList.remove('active-register');
            container.classList.add('active-login');
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed. Please check if the server is running and try again.');
    }
});

// Social Login Handlers
function handleSocialLogin(provider, isLogin = true) {
    const config = oauthConfig[provider];
    
    switch(provider) {
        case 'google':
            const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                `client_id=${config.clientId}` +
                `&redirect_uri=${encodeURIComponent(config.redirectUri)}` +
                `&response_type=code` +
                `&scope=${encodeURIComponent(config.scope)}` +
                `&access_type=offline` +
                `&prompt=consent`;
            window.location.href = googleAuthUrl;
            break;
            
        case 'facebook':
            const facebookAuthUrl = `https://www.facebook.com/v12.0/dialog/oauth?client_id=${config.appId}&redirect_uri=${config.redirectUri}&scope=${config.scope}`;
            window.location.href = facebookAuthUrl;
            break;
            
        case 'github':
            const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${config.clientId}&redirect_uri=${config.redirectUri}&scope=${config.scope}`;
            window.location.href = githubAuthUrl;
            break;
    }
}

// Add click handlers for social login buttons
document.querySelectorAll('.social-icons a').forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        const provider = button.getAttribute('data-provider');
        const isLogin = button.id.includes('login');
        handleSocialLogin(provider, isLogin);
    });
});

const container = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');

// Add active class to container when page loads
window.addEventListener('load', () => {
    container.classList.add('active-login');
});

// Toggle between login and register forms
registerBtn.addEventListener('click', () => {
    container.classList.add('active');
    container.classList.add('active-register');
    container.classList.remove('active-login');
});

loginBtn.addEventListener('click', () => {
    container.classList.remove('active');
    container.classList.remove('active-register');
    container.classList.add('active-login');
});

// Department Selection
const tabButtons = document.querySelectorAll(".tab-btn");
const departmentInput = document.getElementById("selected-department");

tabButtons.forEach(button => {
    button.addEventListener("click", (event) => {
        // Remove active class from all buttons
        tabButtons.forEach(btn => btn.classList.remove("active"));
        
        // Add active class to clicked button
        event.target.classList.add("active");

        // Update hidden input value
        departmentInput.value = event.target.innerText;
    });
});

// Role Selection in Login Form
const roleInputs = document.querySelectorAll(".role-selection input");

roleInputs.forEach(role => {
    role.addEventListener("change", () => {
        console.log("Selected Role:", role.value);
    });
});

// Forgot Password Form Handler
const forgotPasswordForm = document.querySelector('.form-box.forgot-password form');
const forgotPasswordBtn = document.querySelector('.forgot-password-btn');
const backToLoginBtn = document.querySelector('.back-to-login-btn');
const loginFormBox = document.querySelector('.form-box.login');
const forgotPasswordFormBox = document.querySelector('.form-box.forgot-password');

// Create and append the forgot password background element
const forgotPasswordBackground = document.createElement('div');
forgotPasswordBackground.className = 'forgot-password-background';
forgotPasswordBackground.innerHTML = `
    <div class="content">
        <h2>Reset Your Password</h2>
        <p>Enter your email and we'll send you instructions to reset your password.</p>
    </div>
`;
document.querySelector('.container').appendChild(forgotPasswordBackground);

forgotPasswordBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Show elements before animation
    forgotPasswordFormBox.style.display = 'block';
    forgotPasswordBackground.style.display = 'block';
    
    // Hide the toggle box
    document.querySelector('.toggle-box').style.display = 'none';
    
    // Force reflow
    forgotPasswordFormBox.offsetHeight;
    forgotPasswordBackground.offsetHeight;
    
    // Add active classes to trigger animations
    forgotPasswordFormBox.classList.add('active');
    forgotPasswordBackground.classList.add('active');
    loginFormBox.classList.add('hidden');
});

backToLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Remove active class from forgot password form
    forgotPasswordFormBox.classList.remove('active');
    
    // Add reverse class to background for transition
    forgotPasswordBackground.classList.remove('active');
    forgotPasswordBackground.classList.add('reverse');
    
    // Remove hidden class from login form
    loginFormBox.classList.remove('hidden');
    
    // Fade in the toggle box
    const toggleBox = document.querySelector('.toggle-box');
    toggleBox.style.opacity = '0';
    toggleBox.style.display = 'block';
    
    // Use setTimeout to ensure proper transition timing
    setTimeout(() => {
        toggleBox.style.opacity = '1';
        
        // Hide elements and reset classes after transitions complete
        forgotPasswordFormBox.style.display = 'none';
        forgotPasswordBackground.style.display = 'none';
        forgotPasswordBackground.classList.remove('reverse');
    }, 600);
});

forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = forgotPasswordForm.querySelector('input[type="email"]').value;

    if (!email) {
        alert('Please enter your email address');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        
        if (data.success) {
            alert('Password reset instructions have been sent to your email.');
            // Switch back to login form
            document.querySelector('.form-box.login').style.display = 'block';
            document.querySelector('.form-box.forgot-password').style.display = 'none';
            document.querySelector('.toggle-box').style.display = 'block';
        } else {
            alert(data.error || 'Failed to process password reset request');
        }
    } catch (error) {
        console.error('Password reset error:', error);
        alert('Failed to process password reset request. Please try again.');
    }
});
  