// backend/server.js
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const mongoose = require("mongoose");
require("dotenv").config();

const { getPlanByAmount } = require("./plans");
const { grantWifiAccess } = require("./router");
const Transaction = require("./Transaction");
const app = express();
app.use(cors());
app.use(express.json());

// ---------- Environment variable check ----------
const requiredEnv = [
  "MPESA_CONSUMER_KEY",
  "MPESA_CONSUMER_SECRET",
  "MPESA_PASSKEY",
  "MPESA_BUSINESS_SHORTCODE",
  "MPESA_CALLBACK_URL"
];
for (const env of requiredEnv) {
  if (!process.env[env]) {
    console.error(`❌ Missing environment variable: ${env}`);
    process.exit(1);
  }
}

// ---------- MongoDB connection ----------
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/wifi_hotspot";
mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// ---------- Helpers ----------
const getAccessToken = async () => {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  try {
    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${auth}` } }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("Error getting access token:", error.response?.data || error.message);
    throw error;
  }
};

const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = "254" + cleaned.slice(1);
  if (cleaned.startsWith("254") && cleaned.length === 12) return cleaned;
  if (cleaned.length === 9) return "254" + cleaned;
  throw new Error("Invalid phone number format");
};

// ---------- Routes ----------
app.post("/stkpush", async (req, res) => {
  const { phone, amount, plan, mac } = req.body; // mac is optional (from URL query)
  console.log("📥 Payment request:", { phone, amount, plan, mac });

  try {
    const formattedPhone = formatPhoneNumber(phone);
    const accessToken = await getAccessToken();

    const businessShortCode = process.env.MPESA_BUSINESS_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const password = Buffer.from(businessShortCode + passkey + timestamp).toString("base64");

    const stkPushData = {
      BusinessShortCode: businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: businessShortCode,
      PhoneNumber: formattedPhone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: "WiFi Hotspot",
      TransactionDesc: `Payment for ${plan}`
    };

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      stkPushData,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    console.log("✅ STK Push sent:", response.data);

    // Save transaction to database
    if (response.data.CheckoutRequestID) {
      const transaction = new Transaction({
        checkoutRequestID: response.data.CheckoutRequestID,
        phone,
        amount,
        plan,
        mac,
        status: 'pending'
      });
      await transaction.save();
    }

    res.json({
      status: "success",
      message: "STK Push sent. Check your phone.",
      data: response.data
    });
  } catch (error) {
    console.error("❌ STK Push error:", error.response?.data || error.message);
    res.status(500).json({
      status: "error",
      message: "Failed to initiate payment."
    });
  }
});

app.post("/mpesa-callback", async (req, res) => {
  console.log("🔔 M-Pesa callback received");
  const callbackData = req.body;
  const stkCallback = callbackData?.Body?.stkCallback;

  if (!stkCallback) {
    console.log("⚠️ Invalid callback body");
    return res.status(400).json({ ResultCode: 1, ResultDesc: "Invalid request" });
  }

  const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = stkCallback;

  // Always acknowledge M-Pesa immediately
  res.json({ ResultCode: 0, ResultDesc: "Success" });

  // Find the transaction in the database
  let transaction = await Transaction.findOne({ checkoutRequestID: CheckoutRequestID });
  if (!transaction) {
    console.log(`⚠️ No transaction found for CheckoutRequestID: ${CheckoutRequestID}`);
    return;
  }

  if (ResultCode === 0) {
    // Payment successful – extract phone & amount from metadata
    const metadata = CallbackMetadata?.Item || [];
    const phoneItem = metadata.find(item => item.Name === "PhoneNumber");
    const amountItem = metadata.find(item => item.Name === "Amount");

    if (!phoneItem || !amountItem) {
      console.log("⚠️ Missing PhoneNumber or Amount in callback metadata");
      return;
    }

    const phone = phoneItem.Value;
    const amount = amountItem.Value;

    // Determine the plan (use the one from transaction or fallback)
    const plan = transaction.plan || getPlanByAmount(amount);
    if (!plan) {
      console.log(`⚠️ No plan found for amount ${amount}`);
      return;
    }

    console.log(`💰 Payment confirmed: ${phone}, amount ${amount}, plan ${plan}`);

    // Update transaction status
    transaction.status = 'completed';
    transaction.resultCode = ResultCode;
    transaction.resultDesc = ResultDesc;
    await transaction.save();

    try {
      // Grant Wi-Fi access via router
      await grantWifiAccess(phone, plan);
      console.log(`✅ Wi-Fi access granted for ${phone}`);
    } catch (routerError) {
      console.error(`❌ Failed to grant Wi-Fi access for ${phone}:`, routerError.message);
      // Optionally mark transaction for retry
    }
  } else {
    // Payment failed or cancelled
    console.log(`❌ Payment failed/cancelled: ${ResultDesc} (Code ${ResultCode})`);
    transaction.status = 'failed';
    transaction.resultCode = ResultCode;
    transaction.resultDesc = ResultDesc;
    await transaction.save();
  }
});

app.get("/", (req, res) => {
  res.send("WiFi hotspot backend is running");
});

app.get("/access-token", async (req, res) => {
  try {
    const token = await getAccessToken();
    res.json({ access_token: token });
  } catch {
    res.status(500).json({ error: "Failed to get access token" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});