const mongoose = require('mongoose');

const UserStatSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User1', required: true },
  action: { type: String, enum: ['swipe', 'like'], required: true },
}, { timestamps: true });

// Optional: create an index for faster querying by user and date
UserStatSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('UserStat', UserStatSchema);
