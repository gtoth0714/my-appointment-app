# Appointment Scheduling Demo Web Application

## Overview
This is a demo web application for an embedded systems consultancy company, allowing clients to book appointments to discuss electronic development parameters.  
**Note:** This company is fictional, and the site is intended solely as a demonstration.

## Features
- User login with session management
- Appointment booking calendar with conflict detection
- Automatic deletion of past appointments to reduce database load
- Responsive design with thematic electronic circuit background
- Simple and clear UI for easy use

## Technologies Used
- Node.js (http server)
- MongoDB (database)
- Vanilla JavaScript and CSS for frontend
- Environment variables for sensitive data

## Installation & Running
1. Clone the repository  
2. Run `npm install` to install dependencies  
3. Create a `.env` file in the root with: MONGO_URI=your_mongodb_connection_string
4. Run the server: 
node server.js
5. Open `http://localhost:3000` in your browser

## Usage
- Login with username: `userxy` and password: `1234`  
- Book available time slots on the calendar  
- Past appointments older than one week are automatically removed

## Notes
- This is a demo project for showcasing full-stack skills on Upwork.  
- Feel free to extend the functionality or integrate with your own backend.

## License
This project is for demonstration purposes only.

