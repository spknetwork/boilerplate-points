const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log("mongodb connected")

  } catch (error) {
    console.log(error.message);
    //Exit if there is a failure
    process.exit(1)
  }
}

module.exports = connectDB
