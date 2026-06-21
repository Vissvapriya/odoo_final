import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export const roleDashboardMap = {
  ADMIN: '/admin/dashboard',
  OWNER: '/owner/dashboard',
  SALES: '/sales/dashboard',
  PURCHASE: '/purchase/dashboard',
  MANUFACTURING: '/manufacturing/dashboard',
  INVENTORY: '/inventory/dashboard',
};

const RoleGuard = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If logged in but accessing a route they don't have access to,
    // redirect them to their respective role dashboard.
    const redirectPath = roleDashboardMap[user.role] || '/unauthorized';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default RoleGuard;
