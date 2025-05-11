const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const app = express();

// Enable CORS for Live Server
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true
}));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from root directory
app.use(express.static('./'));

// Function to read users data
function readUsers() {
    try {
        const data = fs.readFileSync('users.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { users: [] };
    }
}

// Function to write users data
function writeUsers(data) {
    fs.writeFileSync('users.json', JSON.stringify(data, null, 2));
}

// Registration endpoint
app.post('/register', (req, res) => {
    console.log('Registration request received:', req.body);
    const { username, email, password } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
        console.log('Missing required fields');
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const users = readUsers();
        console.log('Current users:', users);

        // Check if user already exists
        if (users.users.some(user => user.email === email)) {
            console.log('Email already registered:', email);
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Add new user
        const newUser = {
            username,
            email,
            password,
            createdAt: new Date().toISOString()
        };
        console.log('Adding new user:', newUser);

        users.users.push(newUser);
        writeUsers(users);
        console.log('User successfully registered');

        res.json({ success: true, message: 'Registration successful' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed: ' + error.message });
    }
});

// Login endpoint
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const users = readUsers();

    // Find user
    const user = users.users.find(u => u.email === email && u.password === password);

    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({ 
        success: true, 
        message: 'Login successful',
        user: {
            username: user.username,
            email: user.email
        }
    });
});

// OAuth callback handlers
app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.redirect('/error?message=No_code_provided');
    }

    try {
        // Exchange code for tokens
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: 'http://127.0.0.1:5500/auth/google/callback',
            grant_type: 'authorization_code'
        });

        const { access_token, id_token } = tokenResponse.data;

        // Get user info
        const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const userInfo = userInfoResponse.data;
        console.log('User Info:', userInfo);

        // Store Google user info
        const users = readUsers();
        const existingUser = users.users.find(u => u.email === userInfo.email);

        if (!existingUser) {
            users.users.push({
                username: userInfo.name,
                email: userInfo.email,
                googleId: userInfo.id,
                createdAt: new Date().toISOString()
            });
            writeUsers(users);
        }

        // Redirect back to the login page with success
        res.redirect(`/login.html?success=true&email=${encodeURIComponent(userInfo.email)}&name=${encodeURIComponent(userInfo.name)}`);
    } catch (error) {
        console.error('OAuth Error:', error.response?.data || error.message);
        res.redirect('/login.html?error=' + encodeURIComponent(error.message));
    }
});

app.get('/auth/facebook/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const response = await axios.get('https://graph.facebook.com/v12.0/oauth/access_token', {
            params: {
                client_id: process.env.FACEBOOK_APP_ID,
                client_secret: process.env.FACEBOOK_APP_SECRET,
                redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
                code
            }
        });
        
        const { access_token } = response.data;
        const userInfo = await axios.get('https://graph.facebook.com/me', {
            params: {
                fields: 'id,name,email',
                access_token
            }
        });
        
        // Handle user info and create session
        res.redirect('/success');
    } catch (error) {
        res.redirect('/error');
    }
});

app.get('/auth/github/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const response = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code
        }, {
            headers: { Accept: 'application/json' }
        });
        
        const { access_token } = response.data;
        const userInfo = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        
        // Handle user info and create session
        res.redirect('/success');
    } catch (error) {
        res.redirect('/error');
    }
});

// Success page
app.get('/success', (req, res) => {
    res.send(`
        <h1>Login Successful!</h1>
        <p>Welcome ${req.query.name} (${req.query.email})</p>
        <a href="/">Back to Login</a>
    `);
});

// Error page
app.get('/error', (req, res) => {
    res.send(`
        <h1>Error</h1>
        <p>${req.query.message || 'An error occurred during authentication'}</p>
        <a href="/">Back to Login</a>
    `);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Forgot Password endpoint
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    try {
        const users = readUsers();
        const user = users.users.find(u => u.email === email);

        if (!user) {
            return res.status(404).json({ error: 'Email not found' });
        }

        // Generate a reset token (in a real app, you would use a secure token)
        const resetToken = Math.random().toString(36).substring(2, 15);
        
        // Store the reset token with an expiration time
        user.resetToken = resetToken;
        user.resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now
        writeUsers(users);

        // In a real app, you would send an email here
        console.log(`Password reset token for ${email}: ${resetToken}`);

        res.json({ 
            success: true, 
            message: 'Password reset instructions sent to your email' 
        });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Failed to process password reset request' });
    }
});

// Data Deletion Instructions URL for Facebook
app.get('/data-deletion-instructions', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Data Deletion Instructions</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    line-height: 1.6;
                }
                h1 {
                    color: #333;
                }
                .instructions {
                    background: #f5f5f5;
                    padding: 20px;
                    border-radius: 5px;
                    margin: 20px 0;
                }
            </style>
        </head>
        <body>
            <h1>Data Deletion Instructions</h1>
            <div class="instructions">
                <p>To delete your data from our application, please follow these steps:</p>
                <ol>
                    <li>Send an email to our support team at support@example.com with the subject "Data Deletion Request"</li>
                    <li>Include your registered email address in the email</li>
                    <li>We will process your request within 30 days</li>
                    <li>You will receive a confirmation email once your data has been deleted</li>
                </ol>
                <p>If you have any questions, please contact our support team.</p>
            </div>
        </body>
        </html>
    `);
});

// Privacy Policy URL for Facebook
app.get('/privacy-policy', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Privacy Policy</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    line-height: 1.6;
                }
                h1, h2 {
                    color: #333;
                }
                .section {
                    margin: 20px 0;
                }
            </style>
        </head>
        <body>
            <h1>Privacy Policy</h1>
            
            <div class="section">
                <h2>Information We Collect</h2>
                <p>When you use Facebook Login with our application, we collect:</p>
                <ul>
                    <li>Your email address</li>
                    <li>Your public profile information</li>
                    <li>Your name and profile picture</li>
                </ul>
            </div>

            <div class="section">
                <h2>How We Use Your Information</h2>
                <p>We use the information we collect to:</p>
                <ul>
                    <li>Create and manage your account</li>
                    <li>Provide our services to you</li>
                    <li>Communicate with you about our services</li>
                </ul>
            </div>

            <div class="section">
                <h2>Data Storage and Security</h2>
                <p>We take appropriate security measures to protect your personal information. Your data is stored securely and is only accessible to authorized personnel.</p>
            </div>

            <div class="section">
                <h2>Your Rights</h2>
                <p>You have the right to:</p>
                <ul>
                    <li>Access your personal data</li>
                    <li>Request deletion of your data</li>
                    <li>Update or correct your information</li>
                </ul>
            </div>

            <div class="section">
                <h2>Contact Us</h2>
                <p>If you have any questions about this Privacy Policy, please contact us at support@example.com</p>
            </div>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 