import { useState } from "react";
import { authService } from "../Services/User.Services";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { routepath } from "../Routes/route";

export default function ForgotPassword() {
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loader, setLoader] = useState<boolean>(false);
  const navigate = useNavigate();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); 

    // Required check
    if (!email) {
      setError("Email is required");
      return;
    }

    // Format check
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setLoader(true);
      const data = await authService.forgetPassword({ email });
      
      console.log("Response from API:", data); 
      
      // Check if data exists
      if (!data) {
        setError("No response from server. Please try again.");
        setLoader(false);
        return;
      }
      
      // Check if error is true
      if (data.error === true) {
        setError(data.msg || "Failed to send OTP");
        toast.error(data.msg || "Failed to send OTP");
      } 
      // Check if success
      else if (data.success || data.msg) {
        toast.success(data.msg || "OTP sent successfully!");
        setError("");
        // Navigate to OTP page with email
        navigate(routepath.verifyOtp, {
          replace: true,
          state: { email: email }
        });
      } 
      // Default error
      else {
        setError("Something went wrong. Please try again.");
        toast.error("Something went wrong. Please try again.");
      }
      
      setLoader(false);
      
    } catch (error) {
      console.error("Catch block error:", error);
      setError("Network error. Please check your connection.");
      toast.error("Network error. Please check your connection.");
      setLoader(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 font-sans"
      style={{
        backgroundImage: "radial-gradient(circle, #bfdbfe 1px, transparent 1px)",
        backgroundColor: "#f8fafc",
        backgroundSize: "30px 30px",
      }}
    >
      <div
        className="w-full max-w-sm p-8 bg-white rounded-xl shadow-xl border border-blue-200"
        style={{
          boxShadow:
            "0 10px 15px -3px rgba(59, 130, 246, 0.1), 0 4px 6px -2px rgba(59, 130, 246, 0.05)",
        }}
      >
        <div className="flex flex-col items-center">
          <div className="p-3 mb-4 rounded-full bg-blue-100 text-blue-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path
                fillRule="evenodd"
                d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Forgot Password?
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            We'll send you the reset instructions shortly.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address
            </label>

            <input
              type="email"
              id="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(""); // Clear error when user types
              }}
              placeholder="Enter your email"
              className={`w-full px-4 py-2 border rounded-lg 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                placeholder-gray-400 ${error ? 'border-red-500' : 'border-gray-300'}`}
              disabled={loader}
            />

            {/* Error show */}
            {error && (
              <p className="text-red-600 text-sm mt-1 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loader}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl 
                         transition-all duration-200 shadow-lg hover:shadow-xl transform 
                         hover:scale-[1.01] active:scale-[0.99] text-sm mb-6
                         disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none
                         disabled:hover:shadow-lg relative overflow-hidden"
          >
            {loader ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sending OTP...</span>
              </div>
            ) : (
              "Send OTP"
            )}
          </button>
        </form>
        
        {/* Back to login link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Remember your password?{" "}
            <a 
              href="/login" 
              className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
              onClick={(e) => {
                e.preventDefault();
                navigate(routepath.login);
              }}
            >
              Login here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}