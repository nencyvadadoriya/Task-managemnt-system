import { Link, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import type { LoginBody } from "../Types/Types";
import toast from "react-hot-toast";
import { authService } from "../Services/User.Services";
import { routepath } from "../Routes/route";
import { Eye, EyeOff } from "lucide-react";

export default function EmployeeLoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState<LoginBody>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });
  const [loginFailed, setLoginFailed] = useState<string>("");
  const [loader, setLoader] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate(routepath.dashboard, { replace: true });
    }
  }, [navigate]);

  // Validation function
  const validate = () => {
    let valid = true;
    let newErrors: any = { email: "", password: "" };

    // Email validation
    if (!loginData.email.trim()) {
      newErrors.email = "Email is required";
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(loginData.email)) {
      newErrors.email = "Invalid email address";
      valid = false;
    }

    // Password validation
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


  // Handle input changes
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
    if (loginFailed) setLoginFailed("");
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Handle form submit
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validate()) {
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

        // Save token
        localStorage.setItem("token", data.result.token);

        // ✅ Save user information
        if (data.result.user) {
          // Get user data from response
          const apiUser = data.result.user;

          // Extract name from various possible fields
          const userName = apiUser.name ||
            apiUser.username ||
            apiUser.fullName ||
            apiUser.userName ||
            trimmedPayload.email.split('@')[0];

          // Create user object for localStorage
          const userData = {
            id: apiUser.id || apiUser._id || 'user-' + Date.now(),
            name: userName,
            email: apiUser.email || apiUser.userEmail || trimmedPayload.email,
            role: apiUser.role || apiUser.userType || 'employee',
            // If backend doesn't send avatar, use first letter of name
            avatar: apiUser.avatar ||
              apiUser.profilePicture ||
              apiUser.profile_image ||
              userName.charAt(0).toUpperCase()
          };

          console.log("💾 Saving user data:", userData);
          localStorage.setItem("currentUser", JSON.stringify(userData));

          // Log what was saved
          console.log("✅ Saved to localStorage:", userData);
        }

        // Navigate to dashboard
        setTimeout(() => {
          navigate(routepath.dashboard, { replace: true });
        }, 500);

      } else {
        const errorMsg = data.msg || "Invalid credentials";
        setLoginFailed(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error("🚨 Login error:", err);
      toast.error("Something went wrong. Please try again.");
    }

    setLoader(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center px-4">
      <div className="bg-white w-full max-w-2xl rounded-md shadow-xl overflow-hidden border border-gray-200">
        {/* Banner */}
        <div
          className="w-full h-40 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg')",
          }}
        >
          <div className="w-full h-full bg-black/40 flex justify-center items-center">
            <h1 className="text-white text-2xl font-bold tracking-wide text-center px-4">
              EMPLOYEE TASK MANAGEMENT SYSTEM
            </h1>
          </div>
        </div>

        <div className="px-10 py-12">

          {/* Login Form */}
          <form className="space-y-8" onSubmit={handleSubmit}>
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
                  onChange={handleChange}
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
                  onChange={handleChange}
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

            {/* Login Failed Error Message */}
            {loginFailed && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-600 text-sm font-medium">{loginFailed}</p>
              </div>
            )}

            {/* Submit & Forgot Password */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-6 gap-4">

              {/* Login Button */}
              <button
                type="submit"
                disabled={loader}
                className="w-full sm:w-48 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5
               rounded-xl transition-all duration-200 shadow-md hover:shadow-xl
               disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

              {/* Forgot Password */}
              <Link
                to={routepath.forgetPassword}
                className="text-red-500 font-medium hover:underline sm:ml-4"
              >
                Forgotten Password?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
