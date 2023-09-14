const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
       await mongoose.connect(process.env.uri, {
        useNewUrlParser: true,
        useNewUrlParser: true,
        useUnifiedTopology: true

       });
       console.log("mongodb connected")
  
    } catch (error) {
        console.log(error.message);
        //Exit if there is a failure
        process.exit(1)
    }
  }

module.exports = connectDB
