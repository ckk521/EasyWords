import { createBrowserRouter } from "react-router";
import { AdminLogin } from "./pages/admin/Login";
import { AdminDashboard } from "./pages/admin/Dashboard";
import { AdminUsers } from "./pages/admin/Users";
import { AdminUserDetail } from "./pages/admin/UserDetail";
import { AdminSettings } from "./pages/admin/Settings";

export const router = createBrowserRouter([
  {
    path: "/admin/login",
    Component: AdminLogin,
  },
  {
    path: "/admin",
    Component: AdminDashboard,
  },
  {
    path: "/admin/users",
    Component: AdminUsers,
  },
  {
    path: "/admin/users/:id",
    Component: AdminUserDetail,
  },
  {
    path: "/admin/settings",
    Component: AdminSettings,
  },
  {
    path: "*",
    Component: AdminLogin,
  },
]);
