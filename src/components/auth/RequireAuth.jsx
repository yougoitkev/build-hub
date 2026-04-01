import { Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "@/store/app-store";

export function RequireAuth({ children, allowedRoles }) {
    const user = useAppStore((s) => s.user);
    const location = useLocation();

    if (!user) {
        return <Navigate to="/Login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
}
