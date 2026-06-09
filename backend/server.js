import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import { createOrder, capturePayment } from './services/paypal.js'; // ← FIXED IMPORT

dotenv.config();
connectDB();

const app = express();

app.use(
  cors({
    origin: [
      'http://localhost:5173',      // ✅ Local development (http, not https)
      'http://localhost:3000',       // ✅ Alternative local port
      'https://vercelfrontend-1.onrender.com'  // ✅ Your production frontend URL
    ],
    credentials: true
  })
);


app.use(express.json());
app.use("/api/payment", paymentRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Portfolio API Running");
});

// Bank details endpoint
app.get('/api/bank-details', (req, res) => {
  const { currency = 'USD', amount = '0' } = req.query;
  res.json({
    success: true,
    data: {
      currency: currency,
      amount: amount,
      bankName: process.env.WISE_BANK_NAME || 'Wise',
      accountNumber: process.env.WISE_ACCOUNT_NUMBER || '12345678',
      sortCode: process.env.WISE_SORT_CODE || '04-00-04',
      iban: process.env.WISE_IBAN || 'GB00WISE1234567890',
      swift: process.env.WISE_SWIFT || 'WISEGB2L',
      reference: `${process.env.WISE_REFERENCE_PREFIX || 'RESUME'}_${Date.now()}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`
    }
  });
});

// ========== PAYPAL ENDPOINTS ==========

// Create PayPal order
app.post('/api/paypal/create-order', async (req, res) => {
  try {
    const { amount, planName } = req.body;
    const approvalUrl = await createOrder(amount, planName); // ← FIXED (no paypal.)
    res.json({ success: true, approvalUrl });
  } catch (error) {
    console.error('PayPal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PayPal success callback
app.get('/api/paypal/success', async (req, res) => {
  try {
    const { token } = req.query;
    const capture = await capturePayment(token); // ← FIXED (no paypal.)

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <script>
          window.opener.postMessage({ type: 'PAYPAL_SUCCESS', data: ${JSON.stringify(capture)} }, '*');
          window.close();
        </script>
      </head>
      <body>
        <h2>Payment Successful!</h2>
        <p>You can close this window now.</p>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <script>
          window.opener.postMessage({ type: 'PAYPAL_ERROR', error: '${error.message}' }, '*');
          window.close();
        </script>
      </head>
      <body>
        <h2>Payment Failed</h2>
        <p>Please try again.</p>
      </body>
      </html>
    `);
  }
});

// PayPal cancel callback
app.get('/api/paypal/cancel', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <script>
        window.opener.postMessage({ type: 'PAYPAL_CANCEL' }, '*');
        window.close();
      </script>
    </head>
    <body>
      <h2>Payment Cancelled</h2>
      <p>You can close this window now.</p>
    </body>
    </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});