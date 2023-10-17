const express = require("express");
const connectDb = require("./db.js");
const routes = require('./routes/index.js');
const cors = require("cors");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());

//should be remove
const urls = "https://breakaway-page-setup-git-create-f86e40-adesojisouljays-projects.vercel.app" || "https://breakaway-project-setup.onrender.com/"

app.use(cors({
    origin: urls,
}));

app.use(express.urlencoded({extended: true}));

connectDb();

app.use('/', routes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
