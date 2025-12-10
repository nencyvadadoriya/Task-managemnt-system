import { createBrowserRouter } from "react-router";
import App from "../App";
import LoginPage from "../Pages/LoginPage";
import DashbordPage from "../Pages/DashbordPage";
import ForgotPasswordPage from "../Pages/ForgetPasswordPage";
import OtpVerificationPage from "../Pages/OtpVerifyPage";
import ChangePasswordPage from "../Pages/ChangePasswordPage";

export const routepath = {
    login: '/login',
    dashboard: '/dashboard',
    forgetPassword: '/forgetPassword',
    verifyOtp: '/verifyOtp',
    changePassword: '/changePassword'
};

export const route = createBrowserRouter([
    {
        path: '/',
        Component: App,
        children: [
            {
                index: true,
                Component: LoginPage
            },
            {
                path: routepath.login,
                Component: LoginPage
            },
            {
                path: routepath.dashboard,
                Component: DashbordPage
            },
            {
                path: routepath.forgetPassword,
                Component: ForgotPasswordPage
            },
            {
                path: routepath.verifyOtp,
                Component: OtpVerificationPage
            },
            {
                path: routepath.changePassword,
                Component: ChangePasswordPage
            }
        ]
    }
]);
