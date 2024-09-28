const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const loginAdmin = async (req, res) => {
  const { username, password } = req.body;
  
  const admin = await Admin.findOne({ username });
  if (!admin) {
    return res.status(400).send('Admin not found');
  }

  const isPasswordValid = await bcrypt.compare(password, admin.password);
  if (!isPasswordValid) {
    return res.status(400).send('Invalid password');
  }

  const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET, { expiresIn: '24hr' });
  res.json({ token });
};

module.exports = loginAdmin;
