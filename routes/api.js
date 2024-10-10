"use strict";
const { Thread, Reply } = require("../model/ThreadModels");
const crypto = require("crypto");

// password hasher
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

module.exports = function (app) {
  app
    .route("/api/threads/:board")
    .post(async function (req, res) {
      const { board } = req.params;

      let { text, delete_password } = req.query;
      delete_password = hashPassword(delete_password);

      try {
        await Thread.create({ board, text, delete_password });
        res.send(`Successfully added new thread to ${board}`);
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
          .populate({
            path: "replies",
            select: "-delete_password -reported",
            options: { sort: { created_on: -1 }, limit: 3 },
          });
        res.json(threads);
      } catch (error) {
        res.status(400).send("error");
      }
    })
    .delete(async function (req, res) {
      const { board } = req.params;
      let { thread_id, delete_password } = req.query;
      delete_password = hashPassword(delete_password);
      try {
        const thread = await Thread.findOne({
          board,
          _id: thread_id,
        });
        if (thread.delete_password !== delete_password)
          res.send("incorrect password");
        await thread.deleteOne();
        res.send("success");
      } catch (error) {
        res.status(400).send("error");
      }
    })
    .put(async function (req, res) {
      const { board } = req.params;
      const { thread_id } = req.query;
      try {
        const thread = await Thread.find({ board, _id: thread_id });
        thread.reported = true;
        await thread.save();
        res.send("reported");
      } catch (error) {
        res.status(400).send("error");
      }
    });

  app.route("/api/replies/:board");
};
