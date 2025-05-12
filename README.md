# Login System Web Application

A simple and secure web-based login system built with Node.js and Express.

## Features

- User registration and login
- Secure password handling
- Clean and responsive user interface
- Multiple theory pages for content display
- Static file serving for images and styles

## Prerequisites

Before running this application, make sure you have the following installed:
- Node.js (v12 or higher)
- npm (Node Package Manager)

## Installation

1. Clone or download this repository to your local machine
2. Open a terminal in the project directory
3. Install dependencies by running:
   ```bash
   npm install
   ```

## Running the Application

1. Start the server by running:
   ```bash
   npm start
   ```
   or
   ```bash
   node server.js
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:5000/login.html
   ```

## Project Structure

- `server.js` - Main server file
- `login.html` - Login page
- `theory1.html` through `theory4.html` - Content pages
- `style.css` - Main stylesheet
- `script.js` - Main JavaScript file
- `users.json` - User data storage

## Available Pages

- Login Page: `/login.html`
- Theory Pages:
  - `/theory1.html`
  - `/theory2.html`
  - `/theory3.html`
  - `/theory4.html`

## Dependencies

- express: Web framework
- cors: Cross-origin resource sharing
- dotenv: Environment variable management

## Security Notes

- Passwords are stored in plain text for demonstration purposes
- In a production environment, implement proper password hashing
- Use HTTPS in production
- Implement proper session management

## License

This project is open source and available under the MIT License. 
