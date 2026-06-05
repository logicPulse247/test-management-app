import { createBrowserRouter, Navigate } from 'react-router-dom';
import DashboardPage from '@/pages/DashboardPage';
import LoginPage from '@/pages/LoginPage';
import TestCreationPage from '@/pages/TestCreationPage';
import TestTrackingPage from '@/pages/TestTrackingPage';
import AddQuestionsPage from '@/pages/AddQuestionsPage';
import PreviewPublishPage from '@/pages/PreviewPublishPage';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/dashboard',
            element: <DashboardPage />,
          },
          {
            path: '/test-creation',
            element: <TestCreationPage />,
          },
          {
            path: '/questions/:testId',
            element: <AddQuestionsPage />,
          },
          {
            path: '/preview/:testId',
            element: <PreviewPublishPage />,
          },
          {
            path: '/test-tracking',
            element: <TestTrackingPage />,
          },
        ],
      },
    ],
  },
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
