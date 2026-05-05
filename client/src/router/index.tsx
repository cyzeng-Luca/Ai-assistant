import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import AuthGuard from './AuthGuard';

const LoginPage = lazy(() => import('../pages/Login'));
const ChatPage = lazy(() => import('../pages/Chat'));

function LazyFallback() {
  return (
    <div className="h-screen flex items-center justify-center">
      <Spin size="large" />
    </div>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <Suspense fallback={<LazyFallback />}>
              <LoginPage />
            </Suspense>
          }
        />
        {/* 全局路由守卫：所有需要认证的路由放在此 Layout Route 内 */}
        <Route element={<AuthGuard />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<LazyFallback />}>
                <ChatPage />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
