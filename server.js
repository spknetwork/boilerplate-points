const express = require("express");
const connectDb = require("./db.js")
const routes = require('./routes/index.js');
require('dotenv').config()

const app = express();
const port = process.env.PORT || 4000;

// Middleware for parsing JSON request bodies
app.use(express.json());
app.use(express.urlencoded({extended: true}))

connectDb()

app.use('/', routes)

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
