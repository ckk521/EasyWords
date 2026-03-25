import { Navigate } from "react-router";
import { adminStore } from "../../store/adminStore";

interface Props {
  children: React.ReactNode;
}

export function ProtectedAdminRoute({ children }: Props) {
  if (!adminStore.getIsLoggedIn()) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}
