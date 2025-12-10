import axios from "axios";
import type { LoginBody, OtpverifyPayload, RegisterUserBody } from "../Types/Types";
import toast from "react-hot-toast";

class AuthServices {
    authBaseUrl = "https://task-managemnt-backend-app.onrender.com/api/";
    authLoginUrl = "auth/login";
    authRegigsterUrl = "auth/register";
    authForgetPassword = "auth/forgetPassword";
    authVerifyOtp = "auth/verifyOtp";
    authGetAllUsers = "auth/getAllUsers";
    authGetCurrentUser = "auth/CurrentUser";
    async loginUser(payload: LoginBody) {
        try {
            console.log("🔐 Login Request - Email:", payload.email);

            const res = await axios.post(this.authBaseUrl + this.authLoginUrl, payload);

            console.log("✅ Login Response:", res.data);
            return res.data;
        } catch (error: any) {
            console.error("❌ Login Error:", error.response?.data || error.message);
            return error.response?.data || { error: true, msg: error.message || "Something went wrong" };
        }
    }

    async registerUser(payload: RegisterUserBody) {
        try {
            const res = await axios.post(
                this.authBaseUrl + this.authRegigsterUrl,
                {
                    name: payload.name.trim(),
                    email: payload.email.trim().toLowerCase(),
                    password: payload.password,
                    role: payload.role,
                }
            );

            return res.data;
        } catch (error: any) {
            const message = error.response?.data?.message || error.response?.data?.msg || "Something went wrong";
            toast.error(message);
            return {
                success: false,
                error: true,
                message,
            };
        }
    }

    getAuthToken() {
        return localStorage.getItem('token')
    }

    async getAllUsers() {
        try {
            const res = await axios.get(this.authBaseUrl + this.authGetAllUsers);
            return res.data;
        } catch (error: any) {
            toast.error(error.response?.data?.msg || "Something went wrong");
            return null;
        }
    }


    async forgetPassword(payload: any) {
        try {
            const res = await axios.post(this.authBaseUrl + this.authForgetPassword, payload);
            return res.data;
        } catch (error: any) {
            toast.error(error.response?.data?.msg || "Something went wrong");
            return {
                error: true,
                msg: error.response?.data?.msg || "Something went wrong",
                status: error.response?.status || 500
            };
        }
    }

    async otpVerify(payload: OtpverifyPayload) {
        try {
            const res = await axios.post(this.authBaseUrl + this.authVerifyOtp, payload)
            return res.data;
        } catch (error: any) {
            toast.error(error.response?.data?.msg || "Something went wrong");
        }
    }

    // User.Services.ts में
    async getCurrentUser() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                return {
                    success: false,
                    message: "No token found",
                    data: null
                };
            }

            const response = await axios.get(this.authBaseUrl + this.authGetCurrentUser, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.error) {
                return {
                    success: false,
                    data: null,
                    message: response.data.msg || "Failed to fetch user"
                };
            }

            // Format response according to your UserType interface
            const userData = response.data.result;

            if (!userData) {
                return {
                    success: false,
                    data: null,
                    message: "No user data received"
                };
            }

            const formattedUser = {
                id: userData.id || userData._id || '',
                _id: userData._id,
                name: userData.name || 'User',
                role: userData.role || 'user',
                email: userData.email || '',
                phone: userData.phone || '',
                department: userData.department || '',
                location: userData.location || '',
                joinDate: userData.joinDate || '',
                bio: userData.bio || userData.about || '',
                skills: userData.skills || [],
                isActive: userData.isActive !== false
            };

            return {
                success: true,
                data: formattedUser,
                message: response.data.msg || "User fetched successfully"
            };
        } catch (error: any) {
            // Detailed error logging
            if (error.response) {
                console.error('Data:', error.response.data);
            } else {
                console.error('Error message:', error.message);
            }

            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                toast.error("Session expired. Please login again.");
            }

            return {
                success: false,
                data: null,
                message: error.response?.data?.msg || error.message || "Failed to fetch current user"
            };
        }
    }
}

export const authService = new AuthServices();