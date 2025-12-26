import { Navigate } from "react-router";
import { routepath } from "../Routes/route";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
    children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const token = localStorage.getItem("token");

    if (!token) {
        // Redirect to login if no token
        return <Navigate to={routepath.login} replace />;
    }

    return <>{children}</>;
}
