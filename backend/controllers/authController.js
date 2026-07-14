const authService = require('../services/authService');
const { displayEmployeeDesignation } = require('../utils/statusMaps');

exports.login = async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username/Email and Password are required.' });
  }

  try {
    const result = await authService.login(username, password);

    if (result.roleType === 'customer') {
      return res.status(200).json({
        token: result.token,
        roleType: result.roleType,
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          phone: result.user.phone || result.profile?.mobile || '',
          pan: result.profile?.pan || '',
          aadhaar: result.profile?.aadhaar || '',
        },
      });
    }

    return res.status(200).json({
      token: result.token,
      roleType: result.roleType,
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return next ? next(error) : res.status(500).json({ message: 'An internal server error occurred' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const result = await authService.updateProfile(req.auth, req.body || {});
    const profile = result.profile || {};
    const employee = result.employee || null;

    return res.status(200).json({
      message: 'Profile updated successfully.',
      user: {
        id: profile.id || req.auth?.profileId || req.auth?.sub,
        email: profile.email || employee?.email || '',
        fullName: profile.full_name || profile.fullName || employee?.full_name || employee?.fullName || '',
        role: req.auth?.roleType === 'employee'
          ? displayEmployeeDesignation(req.auth?.role || employee?.designation || 'loan_officer') || 'Loan Officer'
          : 'customer',
      },
      employee: employee
        ? {
            employeeId: employee.employee_id || null,
            profileId: employee.profile_id || null,
            designation: displayEmployeeDesignation(employee.designation || 'loan_officer') || 'Loan Officer',
            department: employee.department || '',
            branch: employee.branch || '',
            status: employee.status || '',
          }
        : null,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: 'An internal server error occurred' });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const result = await authService.updatePassword(req.auth, req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: 'An internal server error occurred' });
  }
};
