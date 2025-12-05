import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { routepath } from "../Routes/route";
import { authService } from "../Services/User.Services";
import type { OtpverifyPayload } from "../Types/Types";
import toast from "react-hot-toast";

export default function OtpPage() {

    const [email, setEmail] = useState<string>("");
    const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
    const [timer, setTimer] = useState<number>(120);
    const [error, setError] = useState<string>("");
    const [loader, setLoader] = useState<boolean>(false)

    const inputRefs = useRef<HTMLInputElement[]>([]);


    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!location.state || !location.state.email) {
            navigate(routepath.login, { replace: true });
            return;
        }
        setEmail(location.state.email);
    }, [location.state]);


    useEffect(() => {
        if (timer <= 0) return;

        const t = setInterval(() => {
            setTimer(prev => prev - 1);
        }, 1000);

        return () => clearInterval(t);
    }, [timer]);
    const formateTimer = (sec: number) => {
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        return `0${mins}:${secs < 10 ? "0" : ""}${secs}`;
    };
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const copy = [...otp];
        copy[index] = value;
        setOtp(copy);
        setError("");

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").slice(0, 6);

        if (!/^\d+$/.test(pasted)) return;

        const digits = pasted.split("");
        setOtp(digits);

        inputRefs.current[Math.min(digits.length, 5)]?.focus();
    };

    const handleResend = async(e :any) => {
         e.preventDefault();
            try {
              const  data =  await authService.forgetPassword({email})  
              if(!data.error){
                    toast.success(data.msg)
                    setTimer(120)
                    setError("")
              }else{
                setError(data.msg)
              }
            } catch (error) {
            console.log("somthing went wrong");
               
            }
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const otpString = otp.join("");

        if (otpString.length !== 6) {
            setError("Please enter a valid 6-digit OTP");
            return;
        }
        const payload: OtpverifyPayload = {
            email: email,
            OTP: otpString
        }
        try {
            setLoader(true);
            const data = await authService.otpVerify(payload);

            if (!data.error) {
                toast.success(data.msg || "OTP verified successfully");
                navigate(routepath.changePassword, {
                    replace: true,
                    state: { email }
                });
            } else {
                setError(data.msg || "Invalid OTP");
                toast.error(data.msg || "Invalid OTP");
            }

        } catch (error) {
            toast.error("Something went wrong. Try again!");
        }

        setLoader(false);

    };


    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-blue-50 font-sans">
            <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-lg">

                <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 p-4 mb-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
                            <rect x="15" y="25" width="70" height="50" rx="10" fill="#EBF4FF" stroke="#4C7FFF" strokeWidth="2" />
                            <path d="M15 25 L50 45 L85 25 H15Z" fill="#7FAAFF" />
                            <rect x="25" y="35" width="50" height="2" rx="1" fill="#4C7FFF" opacity="0.4" />
                            <rect x="25" y="40" width="40" height="2" rx="1" fill="#4C7FFF" opacity="0.4" />
                            <circle cx="50" cy="50" r="10" fill="#4C7FFF" />
                            <path d="M45 50 L49 54 L55 46" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>

                    <h2 className="text-xl font-bold text-gray-800 mb-2">
                        Verify Your OTP
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                        A 6-digit code has been sent to your email
                    </p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="flex justify-center space-x-2">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                value={digit}
                                ref={(el) => {
                                    if (el) inputRefs.current[index] = el;
                                }}

                                type="text"
                                maxLength={1}
                                inputMode="numeric"
                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={index === 0 ? handlePaste : undefined}
                                className="w-10 h-12 text-center text-lg font-semibold border-b-2 border-gray-300 
                                focus:border-blue-500 focus:outline-none transition"
                            />
                        ))}
                    </div>

                    <div className="text-left text-sm space-y-1 mt-6 pt-2">
                        <p className="text-gray-600">
                            • The OTP will expire in{" "}
                            <span className="font-semibold text-gray-800">2 minutes</span>
                        </p>

                        <p className="text-gray-600 text-sm flex items-center gap-2">
                            Didn’t receive the code?
                            {timer === 0 ? (
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    className="text-blue-600 font-semibold hover:text-blue-800"
                                >
                                    Resend OTP
                                </button>
                            ) : (
                                <span className="text-blue-500 font-semibold">
                                    {formateTimer(timer)}
                                </span>
                            )}
                        </p>
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
                                <span>verify Otp...</span>
                            </div>
                        ) : (
                            "verify Otp"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}