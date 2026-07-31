const jwt = require('jsonwebtoken');

const loginAdmin = async (req, res) => {
  const { username, password } = req.body;
  
  // High-Security Check against local .env file (Bypasses Database Fragility)
  const masterPassword = process.env.ADMIN_PASSWORD;

  if (!masterPassword) {
    return res.status(500).json({ message: 'Critical: ADMIN_PASSWORD is not configured in backend .env' });
  }

  // Authorize only if both username and password perfectly match the environment variables
  if (username === 'sovraniche' && password === masterPassword) {
    const token = jwt.sign({ adminId: 'sovraniche-master-admin' }, process.env.JWT_SECRET, { expiresIn: '24hr' });
    return res.json({ token, username: 'sovraniche' });
  }

  return res.status(401).json({ message: 'Invalid Sovereign Treasury Credentials' });
};

module.exports = loginAdmin;
