"use strict";
const mongoose = require("mongoose");
const { Schema } = mongoose;

const ThreadSchema = new Schema({
  board: String,
  text: String,
  created_on: { type: Date, default: new Date() },
  bumped_on: { type: Date, default: new Date() },
  reported: { type: Boolean, default: false },
  delete_password: String,
  replies: [{ type: mongoose.SchemaTypes.ObjectId, ref: "Reply", default: [] }],
});

const ReplySchema = new Schema({
  text: String,
  created_on: { type: Date, default: new Date() },
  delete_password: String,
  reported: { type: Boolean, default: false },
});

module.exports = {
  Thread: mongoose.model("Thread", ThreadSchema),
  Reply: mongoose.model("Reply", ReplySchema),
  Board: mongoose.model("Board", BoardSchema),
};
