const jwt = require('jsonwebtoken');

const verifyAdminToken = (req, res, next) => {
  const token = req.headers['authorization'];
  console.log(token)

  if (!token) {
    return res.status(403).json({ message: 'No token provided, authorization denied.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.adminId) {
      return res.status(403).json({ message: 'Invalid token, admin privileges required.' });
    }

    req.adminId = decoded.adminId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token is not valid or expired.' });
  }
};

module.exports = verifyAdminToken;