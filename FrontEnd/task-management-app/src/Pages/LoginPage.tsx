import { Link, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import type { LoginBody, SignupBody, RegisterUserBody } from "../Types/Types";

import toast from "react-hot-toast";
import { authService } from "../Services/User.Services";
import { routepath } from "../Routes/route";
import { Eye, EyeOff, UserPlus, LogIn } from "lucide-react";

export default function AuthPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true); 
  
  // Login state
  const [loginData, setLoginData] = useState<LoginBody>({
    email: "",
    password: "",
  });
  
  // Signup state
  const [signupData, setSignupData] = useState<SignupBody>({
    name: "",
    email: "",
    password: "",
  });
  
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
  });
  
  const [apiError, setApiError] = useState<string>("");
  const [loader, setLoader] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate(routepath.dashboard, { replace: true });
    }
  }, [navigate]);

  // Validation functions
  const validateLogin = () => {
    let valid = true;
    let newErrors: any = { email: "", password: "" };

    if (!loginData.email.trim()) {
      newErrors.email = "Email is required";
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(loginData.email)) {
      newErrors.email = "Invalid email address";
      valid = false;
    }

    if (!loginData.password.trim()) {
      newErrors.password = "Password is required";
      valid = false;
    } else if (loginData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const validateSignup = () => {
    let valid = true;
    let newErrors: any = {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      employeeId: "",
      department: "",
    };

    // Name validation
    if (!signupData.name.trim()) {
      newErrors.name = "Full name is required";
      valid = false;
    }

    // Email validation
    if (!signupData.email.trim()) {
      newErrors.email = "Email is required";
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(signupData.email)) {
      newErrors.email = "Invalid email address";
      valid = false;
    }

    // Password validation
    if (!signupData.password.trim()) {
      newErrors.password = "Password is required";
      valid = false;
    } else if (signupData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      valid = false;
    }
    setErrors(newErrors);
    return valid;
  };

  // Handle input changes for login
  const handleLoginChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
    if (apiError) setApiError("");
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Handle input changes for signup
  const handleSignupChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setSignupData((prev) => ({ ...prev, [name]: value }));
    if (apiError) setApiError("");
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Handle login submit
  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateLogin()) {
      toast.error("Please fill all the fields correctly");
      return;
    }

    setLoader(true);

    try {
      const trimmedPayload = {
        email: loginData.email.trim(),
        password: loginData.password.trim()
      };

      console.log("📤 Login attempt for:", trimmedPayload.email);

      const data = await authService.loginUser(trimmedPayload);

      console.log("📥 Full API response:", data);

      if (!data.error && data.result?.token) {
        toast.success(data.msg || "Login successful!");

        localStorage.setItem("token", data.result.token);

        if (data.result.user) {
          const apiUser = data.result.user;
          const userName = apiUser.name ||
            apiUser.username ||
            apiUser.fullName ||
            apiUser.userName ||
            trimmedPayload.email.split('@')[0];

          const userData = {
            id: apiUser.id || apiUser._id || 'user-' + Date.now(),
            name: userName,
            email: apiUser.email || apiUser.userEmail || trimmedPayload.email,
            role: apiUser.role || apiUser.userType || 'employee'
          };

          console.log("💾 Saving user data:", userData);
          localStorage.setItem("currentUser", JSON.stringify(userData));
        }

        setTimeout(() => {
          navigate(routepath.dashboard, { replace: true });
        }, 500);

      } else {
        const errorMsg = data.msg || "Invalid credentials";
        setApiError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error("🚨 Login error:", err);
      toast.error("Something went wrong. Please try again.");
    }

    setLoader(false);
  };

  // Handle signup submit
 const handleSignupSubmit = async (event: React.FormEvent) => {
  event.preventDefault();

  if (!validateSignup()) {
    toast.error("Please fill all the fields correctly");
    return;
  }

  setLoader(true);

  try {
    const signupPayload: RegisterUserBody = {
      name: signupData.name.trim(),
      email: signupData.email.trim(),
      password: signupData.password.trim(),
      role: 'user',
    };

    const data = await authService.registerUser(signupPayload);
    if (!data.error) {
      toast.success("Registration successful! Please login.");
      
      // Clear form
      setSignupData({
        name: "",
        email: "",
        password: "",
      });
      
      // Switch to login
      setIsLogin(true);
      
      // Pre-fill email in login form
      setLoginData(prev => ({ 
        ...prev, 
        email: signupPayload.email 
      }));

    } else {
      const errorMsg = "Registration failed";
      setApiError(errorMsg);
      toast.error(errorMsg);
    }
  } catch (err: any) {
    console.error("🚨 Signup error:", err);
    
    // Handle specific error messages
    if (err.response?.data?.msg) {
      setApiError(err.response.data.msg);
      toast.error(err.response.data.msg);
    } else if (err.message?.includes("network")) {
      setApiError("Network error. Please check your connection.");
      toast.error("Network error. Please check your connection.");
    } else {
      setApiError("Something went wrong. Please try again.");
      toast.error("Something went wrong. Please try again.");
    }
  }

  setLoader(false);
};

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center px-4">
      <div className="bg-white w-full max-w-2xl rounded-md shadow-xl overflow-hidden border border-gray-200">
        {/* Banner */}
        <div
          className="w-full h-40 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 flex justify-center items-center"
        >
          <div className="w-full h-full bg-black/20 flex justify-center items-center">
            <h1 className="text-white text-2xl font-bold tracking-wide text-center px-4">
              EMPLOYEE TASK MANAGEMENT SYSTEM
            </h1>
          </div>
        </div>

        <div className="px-10 py-8">
          
          {/* Tabs */}
          <div className="flex border-b mb-8">
            <button
              className={`flex-1 py-3 font-semibold text-lg flex items-center justify-center gap-2 ${isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              onClick={() => setIsLogin(true)}
            >
              <LogIn size={20} />
              Login
            </button>
            <button
              className={`flex-1 py-3 font-semibold text-lg flex items-center justify-center gap-2 ${!isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              onClick={() => setIsLogin(false)}
            >
              <UserPlus size={20} />
              Sign Up
            </button>
          </div>

          {/* Login Form */}
          {isLogin ? (
            <form className="space-y-6" onSubmit={handleLoginSubmit}>
              {/* Email */}
              <div className="flex flex-col gap-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="text-lg font-semibold text-gray-700 w-full sm:w-40">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={loginData.email}
                    onChange={handleLoginChange}
                    placeholder="Enter your email"
                    className={`w-full border-b ${errors.email ? "border-red-500" : "border-gray-400"
                      } focus:border-blue-600 outline-none py-2`}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm pl-0 sm:pl-40">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 relative">
                  <label className="text-lg font-semibold text-gray-700 w-full sm:w-40">
                    Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={loginData.password}
                    onChange={handleLoginChange}
                    placeholder="Enter your password"
                    className={`w-full border-b ${errors.password ? "border-red-500" : "border-gray-400"
                      } focus:border-blue-600 outline-none py-2 pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 mt-2 mr-2 text-gray-500"
                  >
                    {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm pl-0 sm:pl-40">{errors.password}</p>
                )}
              </div>

              {/* API Error Message */}
              {apiError && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-red-600 text-sm font-medium">{apiError}</p>
                </div>
              )}

              {/* Submit & Forgot Password */}
              <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-4">
                <button
                  type="submit"
                  disabled={loader}
                  className="w-full sm:w-48 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loader ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Signing in...
                    </>
                  ) : (
                    "Login"
                  )}
                </button>

                <Link
                  to={routepath.forgetPassword}
                  className="text-red-500 font-medium hover:underline sm:ml-4"
                >
                  Forgotten Password?
                </Link>
              </div>

              {/* Signup Link */}
              <div className="text-center pt-4">
                <p className="text-gray-600">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Sign up here
                  </button>
                </p>
              </div>
            </form>
          ) : (
            /* Signup Form */
            <form className="space-y-6" onSubmit={handleSignupSubmit}>
              {/* Name */}
              <div className="flex flex-col gap-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="text-lg font-semibold text-gray-700 w-full sm:w-40">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={signupData.name}
                    onChange={handleSignupChange}
                    placeholder="Enter your full name"
                    className={`w-full border-b ${errors.name ? "border-red-500" : "border-gray-400"
                      } focus:border-blue-600 outline-none py-2`}
                  />
                </div>
                {errors.name && (
                  <p className="text-red-500 text-sm pl-0 sm:pl-40">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="text-lg font-semibold text-gray-700 w-full sm:w-40">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={signupData.email}
                    onChange={handleSignupChange}
                    placeholder="Enter your email"
                    className={`w-full border-b ${errors.email ? "border-red-500" : "border-gray-400"
                      } focus:border-blue-600 outline-none py-2`}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm pl-0 sm:pl-40">{errors.email}</p>
                )}
              </div>
              {/* Password */}
              <div className="flex flex-col gap-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 relative">
                  <label className="text-lg font-semibold text-gray-700 w-full sm:w-40">
                    Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={signupData.password}
                    onChange={handleSignupChange}
                    placeholder="Create a password"
                    className={`w-full border-b ${errors.password ? "border-red-500" : "border-gray-400"
                      } focus:border-blue-600 outline-none py-2 pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 mt-2 mr-2 text-gray-500"
                  >
                    {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm pl-0 sm:pl-40">{errors.password}</p>
                )}
              </div>

              {/* API Error Message */}
              {apiError && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-red-600 text-sm font-medium">{apiError}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loader}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loader ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </div>

              {/* Login Link */}
              <div className="text-center pt-4">
                <p className="text-gray-600">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Login here
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}