const mongoose = require('mongoose');
const transactionSchema = new mongoose.Schema({
  checkoutRequestID: { type: String, unique: true, sparse: true },
  phone: String,
  amount: Number,
  plan: String,
  mac: String,
  status: { type: String, default: 'pending' },
  resultCode: Number,
  resultDesc: String,
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Transaction', transactionSchema);