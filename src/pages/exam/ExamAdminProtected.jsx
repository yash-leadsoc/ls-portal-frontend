import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export default function ExamAdminProtected() {
  const token = localStorage.getItem('exam_admin_token');

  if (!token) {
    return <Navigate to="/exam/admin/login" replace />;
  }

  return <Outlet />;
}