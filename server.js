const express = require("express");
const connectDb = require("./db.js");
const routes = require('./routes/index.js');
const cors = require("cors");
require('dotenv').config();

// chain/index.js is a standalone wallet key derivation demo — not used by the points API
// const getMemonic = require("./chain/index.js")

const app = express();
const port = process.env.PORT || 4000;

const { watchPayments } = require("./hive/hive.js");

app.use(express.json());

app.use(cors());

app.use(express.urlencoded({ extended: true }));

// 🚀 Connect to Database first
const startServer = async () => {
  try {
    await connectDb();

    app.use('/', routes);

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);

      // Start watching for onboarding payments
      // bac.onboard will receive the funds, while oracle-d (or configured creator) will create the account
      const watcherAccount = process.env.HIVE_PAYMENT_RECEIVER || process.env.HIVE_ACCOUNT_CREATOR || 'oracle-d';
      watchPayments(watcherAccount).catch(err => {
        console.error("Failed to start Hive payment watcher:", err);
      });
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();
