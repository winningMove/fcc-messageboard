"use strict";
const { Board, Thread, Reply } = require("../model/BoardModels");

module.exports = function (app) {
  app.route("/api/threads/:board").post(async function (req, res) {
    const { board: name } = req.params;
    if (!name)
      return res.status(400).json({ error: "Board parameter missing" });

    let board = await Board.findOne({ name }, "threads")
      .populate("threads")
      .exec();

    if (!board) {
      board = await new Board({ name }).save();
    }
    const { text, delete_password } = req.query;

    const newThread = await new Thread({ text, delete_password }).save();
    board.threads.push(newThread._id);
    await board.save();

    res.sendStatus(200);
  });

  app.route("/api/replies/:board");
};
