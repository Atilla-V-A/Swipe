const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String, // örn: "Tişört"
    required: true,
    unique: true,
    trim: true,
  },
  slug: {
    type: String, // örn: "tisort"
    required: true,
    unique: true,
    lowercase: true,
  },
  aliases: {
    type: [String], // örn: ["t-shirt", "tshirt", "tee"]
    default: [],
  },
}, { timestamps: true });

module.exports = mongoose.model("Category", categorySchema);