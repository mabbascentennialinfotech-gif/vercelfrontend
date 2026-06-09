import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

export default function PaymentResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(5);

  // Check if payment was successful or failed based on URL or state
  const queryParams = new URLSearchParams(location.search);
  const status =
    queryParams.get("status") || location.state?.status || "success";
  const isSuccess = status === "success";
  const errorMessage =
    queryParams.get("error") ||
    location.state?.error ||
    "Payment failed. Please try again.";

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  // Animation variants
  const animations = {
    bounce: "animate-bounce",
    fadeIn: "animate-fade-in",
    slideUp: "animate-slide-up",
    shake: "animate-shake",
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 ${
        isSuccess
          ? "bg-gradient-to-br from-green-900 via-black to-green-900"
          : "bg-gradient-to-br from-red-900 via-black to-red-900"
      }`}
    >
      <div className="max-w-md w-full text-center">
        {/* Animated Icon */}
        <div
          className={`mb-8 ${isSuccess ? "animate-bounce" : "animate-shake"}`}
        >
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-lg ${
              isSuccess
                ? "bg-green-500 shadow-green-500/50"
                : "bg-red-500 shadow-red-500/50"
            }`}
          >
            {isSuccess ? (
              <CheckCircleIcon className="w-16 h-16 text-white" />
            ) : (
              <XCircleIcon className="w-16 h-16 text-white" />
            )}
          </div>
        </div>

        {/* Message */}
        <h1
          className={`text-4xl font-bold mb-4 animate-fade-in ${
            isSuccess ? "text-white" : "text-white"
          }`}
        >
          {isSuccess ? "Payment Successful! 🎉" : "Payment Failed! 😞"}
        </h1>

        <p
          className={`text-lg mb-2 animate-slide-up ${
            isSuccess ? "text-green-400" : "text-red-400"
          }`}
        >
          {isSuccess
            ? "Thank you for your purchase!"
            : "Something went wrong with your payment"}
        </p>

        <p className="text-white/60 mb-8 animate-slide-up delay-100">
          {isSuccess
            ? "Your premium plan has been activated. You now have full access to all resume templates and features."
            : errorMessage}
        </p>

        {/* Details Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 animate-slide-up delay-200">
          <h3 className="text-white font-semibold mb-3">
            {isSuccess ? "Order Confirmed" : "Order Details"}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-white/70">
              <span>Transaction ID:</span>
              <span className={isSuccess ? "text-green-400" : "text-red-400"}>
                {localStorage.getItem("paymentId")?.slice(0, 20) || "N/A"}...
              </span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Plan:</span>
              <span className="text-white">
                {localStorage.getItem("plan") || "Premium Plan"}
              </span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Status:</span>
              <span className={isSuccess ? "text-green-400" : "text-red-400"}>
                {isSuccess ? "Completed ✓" : "Failed ✗"}
              </span>
            </div>
          </div>
        </div>

        {/* Countdown & Button */}
        <p className="text-white/50 text-sm mb-4">
          Redirecting to home in {countdown} seconds...
        </p>

        <button
          onClick={() => navigate("/")}
          className={`px-8 py-3 rounded-xl font-semibold hover:scale-105 transition-transform duration-200 shadow-lg ${
            isSuccess
              ? "bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-500/30"
              : "bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/30"
          } text-white`}
        >
          {isSuccess ? "Go to Dashboard →" : "Try Again →"}
        </button>
      </div>

      {/* Add Animation Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-10px);
          }
          75% {
            transform: translateX(10px);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-slide-up {
          animation: slideUp 0.5s ease-out;
        }

        .animate-bounce {
          animation: bounce 0.8s ease-in-out;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        .delay-100 {
          animation-delay: 0.1s;
        }

        .delay-200 {
          animation-delay: 0.2s;
        }
      `}</style>
    </div>
  );
}
