"use strict";
const { Thread, Reply } = require("../model/ThreadModels");
const crypto = require("crypto");

// password hasher
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

exports.hashPassword = hashPassword;

exports.app = function (app) {
  app
    .route("/api/threads/:board")
    .post(async function (req, res) {
      const { board } = req.params;
      let { text, delete_password } = req.body;
      delete_password = hashPassword(delete_password);

      try {
        await Thread.create({ board, text, delete_password });
        res.send("success");
      } catch (error) {
        res.status(400).send("error");
      }
    })
    .get(async function (req, res) {
      const { board } = req.params;
      try {
        const threads = await Thread.find(
          { board },
          "-delete_password -reported"
        )
          .sort({ bumped_on: -1 })
          .limit(10)
          .lean();
        threads.forEach((thread) => {
          thread.replies = thread.replies.slice(-3);
          thread.replies.forEach((reply) => {
            delete reply.delete_password;
            delete reply.reported;
          });
        });
        res.json(threads);
      } catch (error) {
        res.status(400).send("error");
      }
    })
    .delete(async function (req, res) {
      let { thread_id, delete_password } = req.body;
      delete_password = hashPassword(delete_password);
      try {
        const thread = await Thread.findById(thread_id);
        if (thread.delete_password !== delete_password) {
          return res.send("incorrect password");
        }
        await Thread.deleteOne({ _id: thread._id });
        res.send("success");
      } catch (error) {
        res.status(400).send("error");
      }
    })
    .put(async function (req, res) {
      const { thread_id } = req.body;
      try {
        const thread = await Thread.findById(thread_id);
        thread.reported = true;
        await thread.save();
        res.send("reported");
      } catch (error) {
        res.status(400).send("error");
      }
    });

  app
    .route("/api/replies/:board")
    .post(async function (req, res) {
      let { text, delete_password, thread_id } = req.body;
      delete_password = hashPassword(delete_password);

      try {
        const thread = await Thread.findById(thread_id);
        const reply = await Reply.create({ text, delete_password });
        thread.bumped_on = reply.created_on;
        thread.replies.push(reply);
        await thread.save();
        res.send("success");
      } catch (error) {
        res.status(400).send("error");
      }
    })
    .get(async function (req, res) {
      const { board } = req.params;
      const { thread_id } = req.query;
      try {
        const thread = await Thread.findOne(
          { _id: thread_id },
          "-delete_password -reported"
        ).select({
          "replies.delete_password": 0,
          "replies.reported": 0,
        });
        res.json(thread);
      } catch (error) {
        res.status(400).send("error");
      }
    })
    .delete(async function (req, res) {
      let { thread_id, reply_id, delete_password } = req.body;
      delete_password = hashPassword(delete_password);
      try {
        const thread = await Thread.findById(thread_id);
        const reply = thread.replies.id(reply_id);
        if (reply.delete_password !== delete_password)
          return res.send("incorrect password");
        reply.text = "[deleted]";
        await thread.save();
        res.send("success");
      } catch (error) {
        res.status(400).send("error");
      }
    })
    .put(async function (req, res) {
      const { reply_id } = req.body;
      try {
        const reply = await Reply.findOne({ _id: reply_id });
        reply.reported = true;
        await reply.save();
        res.send("reported");
      } catch (error) {
        res.status(400).send("error");
      }
    });
};
