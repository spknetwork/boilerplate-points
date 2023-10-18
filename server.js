const express = require("express");
const connectDb = require("./db.js");
const routes = require('./routes/index.js');
const cors = require("cors");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());

const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://breakaway-page-setup.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
];

app.use(cors({
    origin: allowedOrigins,
}));

app.use(express.urlencoded({extended: true}));

connectDb();

app.use('/', routes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
