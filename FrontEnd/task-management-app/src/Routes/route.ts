// router/index.tsx
import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import LoginPage from "../Pages/LoginPage";
import DashboardPage from "../Pages/DashboardPage";
import ForgotPasswordPage from "../Pages/ForgetPasswordPage";
import OtpVerificationPage from "../Pages/OtpVerifyPage";
import ChangePasswordPage from "../Pages/ChangePasswordPage";
import TeamPage from "../Pages/TeamPage";
import BrandsListPage from "../Pages/BrandsListPage";
import BrandDetailPage from "../Pages/BrandDetailPage";
import UserProfilePage from "../Pages/UserProfilePage";
import CalendarView from "../Pages/CalendarView";

export const routepath = {
    login: '/login',
    dashboard: '/dashboard',
    forgetPassword: '/forgetPassword',
    verifyOtp: '/verifyOtp',
    changePassword: '/changePassword',
    tasks: '/tasks',
    calendar: '/calendar',
    team: '/team',
    profile: '/profile',
    brands: '/brands',
    brandDetail: '/brands/:brandId'
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
                Component: DashboardPage
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
            },
            {
                path: routepath.tasks,
                Component: DashboardPage
            },
            {
                path: routepath.calendar,
                Component: CalendarView
            },
            {
                path: routepath.team,
                Component: TeamPage
            },
            {
                path: routepath.profile,
                Component: UserProfilePage
            },
            {
                path: routepath.brands,
                Component: BrandsListPage
            },
            {
                path: routepath.brandDetail,
                Component: BrandDetailPage
            }
        ]
    }
]);