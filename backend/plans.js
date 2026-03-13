// backend/plans.js
const plans = {
  20:  { durationMinutes: 60,    profile: "1-hour" },   // 20 KES -> 1 hour
  40:  { durationMinutes: 120,   profile: "2-hour" },   // 40 KES -> 2 hours
  60:  { durationMinutes: 180,   profile: "3-hour" },   // 60 KES -> 3 hours
  140: { durationMinutes: 10080, profile: "1-week" },   // 140 KES -> 1 week (7*24*60)
  280: { durationMinutes: 20160, profile: "2-weeks" },  // 280 KES -> 2 weeks
  600: { durationMinutes: 43200, profile: "1-month" }   // 600 KES -> 30 days (30*24*60)
};

function getPlanByAmount(amount) {
  return plans[amount] || null;
}

module.exports = { getPlanByAmount };