const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  checkoutRequestID: { type: String, unique: true, sparse: true, index: true },
  phone: String,
  amount: Number,
  plan: String,          // human-readable plan name (e.g., "1 day")
  mac: String,           // client MAC address from hotspot
  status: { type: String, default: 'pending' }, // pending, completed, failed
  resultCode: Number,
  resultDesc: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);