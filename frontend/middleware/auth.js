// Check if user is logged in
exports.isLoggedIn = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  
  req.flash('error_msg', 'Please log in to access this page');
  res.redirect('/auth/login');
};

// Check if user is logged out
exports.isLoggedOut = (req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  
  // Redirect based on user role
  if (req.session.user.role === 'admin') {
    res.redirect('/admin/dashboard');
  } else if (req.session.user.role === 'farmer') {
    res.redirect('/farmer/dashboard');
  } else {
    res.redirect('/vendor/dashboard');
  }
};

// Check if user is admin
exports.isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  
  req.flash('error_msg', 'Not authorized to access this page');
  res.redirect('/');
};

// Check if user is farmer
exports.isFarmer = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'farmer') {
    return next();
  }
  
  req.flash('error_msg', 'Not authorized to access this page');
  res.redirect('/');
};

// Check if user is vendor
exports.isVendor = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'vendor') {
    return next();
  }
  
  req.flash('error_msg', 'Not authorized to access this page');
  res.redirect('/');
}; 