const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 4000;

// Middleware for parsing JSON request bodies
app.use(bodyParser.json());

// Define the endpoint for handling POST requests
app.post("/user-info", (req, res) => {
  // Check if the request body contains a "username" property
  if (!req.body.username) {
    return res
      .status(400)
      .json({ error: "Username is required in the request body." });
  }

  // Your logic for generating the response JSON
  const response = {
    username: req.body.username,
    points: "7853.642",
    points_by_type: {
      10: "1713.000",
      20: "10.000",
      30: "1910.000",
      100: "4995.000",
      110: "4622.199",
      120: "1561.556",
      130: "732.900",
      150: "39752.987",
      160: "100.000",
    },
    unclaimed_points: "0.000",
    unclaimed_points_by_type: {},
  };

  res.json(response);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
