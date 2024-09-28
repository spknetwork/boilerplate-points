const express = require("express");
const connectDb = require("./db.js");
const routes = require('./routes/index.js');
const cors = require("cors");
require('dotenv').config();
const { createAdmin } = require("./scripts/createAdmin.js")

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());
  
  app.use(cors());
  
app.use(express.urlencoded({extended: true}));

connectDb();

// createAdmin()

app.use('/', routes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
