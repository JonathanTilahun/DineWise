const mongoose = require('mongoose'); // Import Mongoose
const config = require('./config.json'); // Import your config file

// Extract MongoDB URI from the config file
const mongoURI = config.mongodb;

// Function to connect to MongoDB
const connectToDatabase = async () => {
  try {
    // Connect to MongoDB using Mongoose
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true, // For using new URL string parser
      useUnifiedTopology: true, // To use the latest server discovery and monitoring engine
    });

    console.log('Connected to MongoDB successfully!');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1); // Exit the application if there's a connection error
  }
};

module.exports = connectToDatabase; // Export the function
