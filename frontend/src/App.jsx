import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/AdminLayout.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { OrgProvider } from "./context/OrgContext.jsx";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage.jsx";
import AdminOrganizationsPage from "./pages/admin/AdminOrganizationsPage.jsx";
import AdminUsersPage from "./pages/admin/AdminUsersPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import GuestRoute from "./pages/GuestRoute.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import AcceptInvitePage from "./pages/orgs/AcceptInvitePage.jsx";
import OrganizationsPage from "./pages/orgs/OrganizationsPage.jsx";
import OrgMembersPage from "./pages/orgs/OrgMembersPage.jsx";
import OrgSettingsPage from "./pages/orgs/OrgSettingsPage.jsx";
import OrgWorkspacePage from "./pages/orgs/OrgWorkspacePage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import "./styles/auth.css";
import "./styles/dashboard.css";
import "./styles/admin.css";
import "./styles/orgs.css";

function App() {
  return (
    <AuthProvider>
      <OrgProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              }
            />
            <Route
              path="/register"
              element={
                <GuestRoute>
                  <RegisterPage />
                </GuestRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orgs"
              element={
                <ProtectedRoute>
                  <OrganizationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orgs/:orgId"
              element={
                <ProtectedRoute>
                  <OrgWorkspacePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orgs/:orgId/members"
              element={
                <ProtectedRoute>
                  <OrgMembersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orgs/:orgId/settings"
              element={
                <ProtectedRoute>
                  <OrgSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invite/accept"
              element={
                <ProtectedRoute>
                  <AcceptInvitePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="organizations" element={<AdminOrganizationsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </OrgProvider>
    </AuthProvider>
  );
}

export default App;
