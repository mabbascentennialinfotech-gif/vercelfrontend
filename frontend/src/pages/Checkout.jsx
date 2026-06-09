import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../services/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import axios from "axios";
import { useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Checkout() {
  const navigate = useNavigate();
  const { planId } = useParams();

  useEffect(() => {
    // Load PayPal SDK dynamically
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${import.meta.env.VITE_PAYPAL_CLIENT_ID}&currency=USD`;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const plans = {
    basic: { name: "Basic Plan", price: 19, inrPrice: 1900 },
    professional: { name: "Professional Plan", price: 35, inrPrice: 3500 },
    business: { name: "Business Plan", price: 49, inrPrice: 4900 },
  };

  const plan = plans[planId];

  if (!plan) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Invalid Plan
      </div>
    );
  }

  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    country: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [loading, setLoading] = useState(false);
  const [showWiseDetails, setShowWiseDetails] = useState(false);
  const [bankDetails, setBankDetails] = useState(null);

  // ========== PAYPAL PAYMENT ==========

  // Add this useEffect hook at the top of your component

  const handlePayPalPayment = async () => {
    if (!customer.name || !customer.email || !customer.country) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);

    try {
      // Save checkout to Firebase
      const checkoutRef = await addDoc(collection(db, "checkouts"), {
        customerName: customer.name,
        customerEmail: customer.email,
        country: customer.country,
        planId,
        planName: plan.name,
        amount: plan.price,
        paymentMethod: "paypal",
        status: "pending",
        createdAt: serverTimestamp(),
      });

      console.log("Checkout saved:", checkoutRef.id);

      // Call backend to create PayPal order
      const response = await axios.post(`${API_URL}/paypal/create-order`, {
        amount: plan.price,
        planName: plan.name,
      });

      console.log("PayPal response:", response.data);

      if (response.data.success && response.data.approvalUrl) {
        // Open PayPal in new window
        const paypalWindow = window.open(
          response.data.approvalUrl,
          "PayPal",
          "width=800,height=600",
        );

        // Listen for message from PayPal window
        // Inside handlePayPalPayment function, update the message handler:

        const handleMessage = async (event) => {
          if (event.data.type === "PAYPAL_SUCCESS") {
            console.log("Payment success:", event.data.data);

            // Save to Firebase
            await addDoc(collection(db, "payments"), {
              customerName: customer.name,
              customerEmail: customer.email,
              country: customer.country,
              planId,
              planName: plan.name,
              amount: plan.price,
              paymentId: event.data.data.id,
              status: "success",
              createdAt: serverTimestamp(),
            });

            // Save premium access
            localStorage.setItem(
              "premiumUser",
              JSON.stringify({
                premium: true,
                plan: planId,
                paymentId: event.data.data.id,
              }),
            );
            localStorage.setItem("paymentId", event.data.data.id);
            localStorage.setItem("plan", plan.name);

            // Navigate to success page
            navigate("/payment-result?status=success");
          } else if (event.data.type === "PAYPAL_ERROR") {
            // Navigate to failure page
            navigate(
              `/payment-result?status=failed&error=${encodeURIComponent(event.data.error)}`,
            );
          } else if (event.data.type === "PAYPAL_CANCEL") {
            navigate(
              "/payment-result?status=failed&error=Payment was cancelled",
            );
          }
        };

        window.addEventListener("message", handleMessage);
      } else {
        throw new Error("No approval URL received");
      }
    } catch (error) {
      console.error("PayPal error:", error);
      alert(error.response?.data?.error || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ========== RAZORPAY PAYMENT ==========
  const handleRazorpayPayment = async () => {
    if (!customer.name || !customer.email || !customer.country) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "checkouts"), {
        customerName: customer.name,
        customerEmail: customer.email,
        country: customer.country,
        planId,
        planName: plan.name,
        amount: plan.price,
        paymentMethod: "razorpay",
        createdAt: serverTimestamp(),
      });

      const options = {
        key: "rzp_test_StakiXOncRSqJe",
        amount: plan.inrPrice,
        currency: "INR",
        name: "Centennial Portfolio",
        description: plan.name,
        handler: async function (response) {
          await addDoc(collection(db, "payments"), {
            customerName: customer.name,
            customerEmail: customer.email,
            country: customer.country,
            planId,
            planName: plan.name,
            amount: plan.price,
            razorpayPaymentId: response.razorpay_payment_id,
            status: "success",
            createdAt: serverTimestamp(),
          });

          localStorage.setItem(
            "premiumUser",
            JSON.stringify({
              premium: true,
              plan: planId,
              paymentId: response.razorpay_payment_id,
            }),
          );

          navigate("/success");
        },
        prefill: {
          name: customer.name,
          email: customer.email,
        },
        theme: { color: "#8b5cf6" },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ========== WISE BANK TRANSFER ==========
  const handleWisePayment = async () => {
    if (!customer.name || !customer.email || !customer.country) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "checkouts"), {
        customerName: customer.name,
        customerEmail: customer.email,
        country: customer.country,
        planId,
        planName: plan.name,
        amount: plan.price,
        paymentMethod: "wise",
        status: "pending",
        createdAt: serverTimestamp(),
      });

      const response = await axios.get(`${API_URL}/bank-details`, {
        params: { currency: "USD", amount: plan.price },
      });

      if (response.data.success) {
        setBankDetails(response.data.data);
        setShowWiseDetails(true);
      }
    } catch (error) {
      alert("Failed to load bank details");
    } finally {
      setLoading(false);
    }
  };

  // ========== CARD PAYMENT (Stripe - Coming Soon) ==========
  const handleCardPayment = async () => {
    alert("Credit/Debit Card payment coming soon!");
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied!");
  };

  // Show Wise bank details
  if (showWiseDetails && bankDetails) {
    return (
      <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-28 py-20">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setShowWiseDetails(false)}
            className="mb-6 text-white/60 hover:text-white"
          >
            ← Back to Checkout
          </button>
          <div className="bg-white/[0.05] border border-white/10 rounded-[32px] p-10">
            <h1 className="text-3xl font-black mb-2">
              Bank Transfer Instructions
            </h1>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-8">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span>Reference</span>
                  <span className="font-mono text-yellow-400">
                    {bankDetails.reference}
                  </span>
                  <button
                    onClick={() => copyToClipboard(bankDetails.reference)}
                    className="text-blue-400"
                  >
                    Copy
                  </button>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/10">
                  <span>Account Number</span>
                  <span>{bankDetails.accountNumber}</span>
                  <button
                    onClick={() => copyToClipboard(bankDetails.accountNumber)}
                    className="text-blue-400"
                  >
                    Copy
                  </button>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span>Sort Code</span>
                  <span>{bankDetails.sortCode}</span>
                  <button
                    onClick={() => copyToClipboard(bankDetails.sortCode)}
                    className="text-blue-400"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
            <p className="text-white/50 text-sm text-center">
              Send exactly ${plan.price} USD. We'll notify you when confirmed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main checkout form
  return (
    <div className="min-h-screen bg-black text-white px-6 md:px-16 lg:px-28 py-20">
      <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10">
        {/* LEFT - Form */}
        <div className="bg-white/[0.05] border border-white/10 rounded-[32px] p-10">
          <h1 className="text-4xl font-black mb-4">Checkout</h1>
          <div className="space-y-5">
            <input
              type="text"
              placeholder="Full Name"
              value={customer.name}
              onChange={(e) =>
                setCustomer({ ...customer, name: e.target.value })
              }
              className="w-full p-4 rounded-2xl bg-black/40 border border-white/10 focus:outline-none focus:border-blue-500"
            />
            <input
              type="email"
              placeholder="Email Address"
              value={customer.email}
              onChange={(e) =>
                setCustomer({ ...customer, email: e.target.value })
              }
              className="w-full p-4 rounded-2xl bg-black/40 border border-white/10 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Country"
              value={customer.country}
              onChange={(e) =>
                setCustomer({ ...customer, country: e.target.value })
              }
              className="w-full p-4 rounded-2xl bg-black/40 border border-white/10 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="mt-10">
            <h2 className="text-2xl font-bold mb-5">Payment Method</h2>
            <div className="space-y-4">
              <button
                onClick={() => setPaymentMethod("card")}
                className={`w-full border rounded-2xl p-5 text-left transition ${
                  paymentMethod === "card"
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-white/10"
                }`}
              >
                💳 Credit / Debit Card
              </button>
              <button
                onClick={() => setPaymentMethod("razorpay")}
                className={`w-full border rounded-2xl p-5 text-left transition ${
                  paymentMethod === "razorpay"
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-white/10"
                }`}
              >
                🇮🇳 UPI / Razorpay
              </button>
              <button
                onClick={() => setPaymentMethod("paypal")}
                className={`w-full border rounded-2xl p-5 text-left transition ${
                  paymentMethod === "paypal"
                    ? "border-green-500 bg-green-500/10"
                    : "border-white/10"
                }`}
              >
                🌍 PayPal
              </button>
              <button
                onClick={() => setPaymentMethod("wise")}
                className={`w-full border rounded-2xl p-5 text-left transition ${
                  paymentMethod === "wise"
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-white/10"
                }`}
              >
                🏦 Bank Transfer (Wise)
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT - Order Summary */}
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 rounded-[32px] p-10 h-fit sticky top-10">
          <h2 className="text-3xl font-black">Order Summary</h2>
          <div className="mt-10 space-y-5">
            <div className="flex justify-between">
              <span className="text-white/60">Plan</span>
              <span className="font-semibold">{plan.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Billing</span>
              <span>One Time</span>
            </div>
            <div className="border-t border-white/10 pt-5 flex justify-between text-2xl font-bold">
              <span>Total</span>
              <span>${plan.price} USD</span>
            </div>
          </div>

          <button
            onClick={() => {
              if (paymentMethod === "paypal") {
                handlePayPalPayment();
              } else if (paymentMethod === "razorpay") {
                handleRazorpayPayment();
              } else if (paymentMethod === "wise") {
                handleWisePayment();
              } else if (paymentMethod === "card") {
                handleCardPayment();
              }
            }}
            disabled={loading}
            className="w-full mt-10 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading
              ? "Processing..."
              : `Pay with ${paymentMethod === "card" ? "Card" : paymentMethod === "razorpay" ? "Razorpay" : paymentMethod === "paypal" ? "PayPal" : "Bank Transfer"}`}
          </button>

          <p className="text-white/50 text-sm text-center mt-6 leading-relaxed">
            🔒 Secure encrypted checkout. Your payment information is protected.
          </p>
        </div>
      </div>
    </div>
  );
}
