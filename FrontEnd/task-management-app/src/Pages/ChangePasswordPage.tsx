import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { routepath } from "../Routes/route";

export default function ChangePasswordPage() {

    const [newPass, setNewPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const [error, setError] = useState("");
    const [loader, setLoader] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();
    useEffect(() => {
        if (!location.state || !location.state.email) {
            navigate(routepath.login, { replace: true });
        }
    }, [location.state]);


    const handleSubmit = async (e: any) => {
        e.preventDefault();

        if (!newPass || !confirmPass) {
            setError("All fields are required");
            return;
        }

        if (newPass.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }

        if (newPass !== confirmPass) {
            setError("Passwords do not match");
            return;
        }

        setError("");
        setLoader(true);

        console.log("Change Password API CALL:", {
            email: location.state.email,
            newPass,
        });

        setTimeout(() => {
            setLoader(false);
            navigate(routepath.login, { replace: true });
        }, 1200);
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-blue-50 p-6 font-sans">

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

                {/* HEADER */}
                <div className="text-center mb-6">
                    <div className="w-24 h-24 p-4 mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                        {/* SVG icon */}
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2C9.2 2 7 4.2 7 7V10H17V7C17 4.2 14.8 2 12 2Z" fill="#4C7FFF" />
                            <path d="M6 10H18C19.1 10 20 10.9 20 12V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V12C4 10.9 4.9 10 6 10Z" fill="#7FAAFF" />
                            <path d="M12 15C10.9 15 10 15.9 10 17C10 17.7 10.4 18.3 11 18.7V20H13V18.7C13.6 18.3 14 17.7 14 17C14 15.9 13.1 15 12 15Z" fill="white" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-800">Change Password</h2>
                    <p className="text-sm text-gray-500 mt-1">Set a new password for your account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Error */}
                    {error && (
                        <p className="text-center text-red-600 font-medium">{error}</p>
                    )}

                    {/* New Password */}
                    <div className="flex flex-col">
                        <label className="text-gray-700 font-medium mb-1">New Password</label>
                        <input
                            type="password"
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                            placeholder="Enter new password"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2
                            focus:ring-blue-500 focus:outline-none transition"
                        />
                    </div>

                    {/* Confirm Password */}
                    <div className="flex flex-col">
                        <label className="text-gray-700 font-medium mb-1">Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPass}
                            onChange={(e) => setConfirmPass(e.target.value)}
                            placeholder="Re-enter password"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 
                            focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                        />
                    </div>

                    {/* Button */}
                    <button
                        type="submit"
                        disabled={loader}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold
                        hover:bg-blue-700 shadow-lg transition disabled:bg-blue-400"
                    >
                        {loader ? "Updating..." : "Update Password"}
                    </button>

                </form>

            </div>
        </div>
    );
}