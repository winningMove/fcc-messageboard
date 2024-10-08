"use strict";
const mongoose = require("mongoose");
const { Schema } = mongoose;
const crypto = require("crypto");

const BoardSchema = new Schema({
  name: String,
  threads: [
    { type: mongoose.SchemaTypes.ObjectId, ref: "Thread", default: [] },
  ],
});

// Helper to hash the delete_password
function hashPassword(next) {
  if (this.isNew) {
    this.delete_password = crypto
      .createHash("sha256")
      .update(this.delete_password)
      .digest("hex");
  }
  next();
}

const ThreadSchema = new Schema({
  text: String,
  created_on: { type: Date, default: Date.now },
  bumped_on: { type: Date, default: Date.now },
  reported: { type: Boolean, default: false },
  delete_password: String,
  replies: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Reply", default: [] }],
});

const ReplySchema = new Schema({
  text: String,
  created_on: { type: Date, default: Date.now },
  delete_password: String,
  reported: { type: Boolean, default: false },
});

ThreadSchema.pre("save", hashPassword);
ReplySchema.pre("save", hashPassword);

exports.Thread = mongoose.model("Thread", ThreadSchema);
exports.Reply = mongoose.model("Reply", ReplySchema);
