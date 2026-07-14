import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import CustomerLayout from '../layouts/CustomerLayout';
import EmployeeLayout from '../layouts/EmployeeLayout';
import ProtectedRoute from './ProtectedRoute';

// Lazy-loaded pages (imported directly for simpler static bundle in prototypes)
import Login from '../pages/auth/Login';

// Customer Portal Pages
import CustomerDashboard from '../pages/customer/Dashboard';
import ApplyLoan from '../pages/customer/ApplyLoan';
import MyApplications from '../pages/customer/MyApplications';
import CustomerNotifications from '../pages/customer/Notifications';
import CustomerProfile from '../pages/customer/Profile';

// Employee Portal Pages
import EmployeeDashboard from '../pages/employee/Dashboard';
import Queue from '../pages/employee/Queue';
import ApplicationDetails from '../pages/employee/ApplicationDetails';
import AuditLogs from '../pages/employee/AuditLogs';
import Settings from '../pages/employee/Settings';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Customer Routes */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute allowedRoleType="customer">
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route path="" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CustomerDashboard />} />
        <Route path="apply-loan" element={<ApplyLoan />} />
        <Route path="my-applications" element={<MyApplications />} />
        <Route path="notifications" element={<CustomerNotifications />} />
        <Route path="profile" element={<CustomerProfile />} />
      </Route>

      {/* Employee Routes */}
      <Route
        path="/employee"
        element={
          <ProtectedRoute allowedRoleType="employee">
            <EmployeeLayout />
          </ProtectedRoute>
        }
      >
        <Route path="" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<EmployeeDashboard />} />
        
        {/* Simplified primary working pages */}
        <Route path="applications" element={<Queue />} />
        <Route path="application/:id" element={<ApplicationDetails />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Wildcard 404 redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
