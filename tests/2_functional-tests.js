const chaiHttp = require("chai-http");
const chai = require("chai");
const assert = chai.assert;
const server = require("../server");
const { Thread, Reply } = require("../model/ThreadModels");
const { suiteSetup, suiteTeardown } = require("mocha");
const { hashPassword } = require("../routes/api");

chai.use(chaiHttp);

let requester,
  idForDeletion,
  pwdForDeletion,
  idForReporting,
  replyIdForDeletion,
  replyPwdForDeletion,
  replyIdForReporting;

async function cleanAndPopulateDB() {
  await Promise.all([Thread.deleteMany({}), Reply.deleteMany({})]);
  const threadsToCreate = [];

  for (let i = 0; i < 3; i++) {
    const repliesToCreate = [];
    for (let j = 0; j < 4; j++) {
      repliesToCreate.push({
        text: `reply ${j} to thread ${i}`,
        delete_password: hashPassword(`pwd${i}${j}`),
      });
    }
    const replies = await Reply.create(repliesToCreate);
    if (!replyIdForDeletion) {
      replyIdForDeletion = replies.find(
        (r) => r.text === "reply 2 to thread 0"
      )._id;
      replyPwdForDeletion = "pwd02";
      replyIdForReporting = replies.find(
        (r) => r.text === "reply 3 to thread 0"
      )._id;
    }

    threadsToCreate.push({
      board: "b",
      text: `New thread ${i}`,
      delete_password: hashPassword(`pwd${i}`),
      replies: replies,
    });
  }
  const threads = await Thread.create(threadsToCreate);

  idForDeletion = threads.find((thread) => thread.text === "New thread 1")._id;
  idForReporting = threads.find((thread) => thread.text === "New thread 2")._id;
  pwdForDeletion = "pwd1";
}

suite("Functional Tests", function () {
  suiteSetup(async function openConnection() {
    requester = chai.request(server).keepOpen();
    await cleanAndPopulateDB();
  });
  suiteTeardown(async function closeConnection() {
    await Promise.all([Thread.deleteMany({}), Reply.deleteMany({})]);
    requester.close();
  });

  suite("Thread tests", function () {
    test("creating a new thread succeeds via POST to /api/threads/{board}", (done) => {
      requester
        .post("/api/threads/b")
        .send({
          board: "b",
          text: "New thread test",
          delete_password: "turtles",
        })
        .end((err, res) => {
          assert.strictEqual(res.text, "success");
          done();
        });
    });

    test("viewing the 10 most recent threads with 3 replies each via GET to /api/threads/{board}", (done) => {
      requester.get("/api/threads/b").end((err, res) => {
        assert.isArray(res.body);
        assert.isBelow(res.body.length, 10);
        assert.isBelow(res.body[1].replies.length, 4);
        assert.notProperty(res.body[1], "delete_password");
        assert.notProperty(res.body[2], "reported");
        assert.notProperty(res.body[1].replies[0], "delete_password");
        assert.notProperty(res.body[2].replies[2], "reported");
        done();
      });
    });

    test("deleting a thread with incorrect password fails via DELETE to /api/threads/{board}", (done) => {
      requester
        .delete("/api/threads/b")
        .send({ thread_id: String(idForDeletion), delete_password: "pwd4" })
        .end((err, res) => {
          assert.strictEqual(res.text, "incorrect password");
          done();
        });
    });
    test("deleting a thread with correct password succeeds via DELETE to /api/threads/{board}", (done) => {
      requester
        .delete("/api/threads/b")
        .send({
          thread_id: String(idForDeletion),
          delete_password: pwdForDeletion,
        })
        .end((err, res) => {
          assert.strictEqual(res.text, "success");
          done();
        });
    });
    test("reporting a thread succeeds via PUT to /api/threads/{board}", (done) => {
      requester
        .put("/api/threads/b")
        .send({ thread_id: String(idForReporting) })
        .end((err, res) => {
          assert.strictEqual(res.text, "reported");
          done();
        });
    });
  });

  suite("Reply tests", function () {
    test("creating a new reply succeeds via POST to /api/replies/{board}", (done) => {
      requester
        .post("/api/replies/b")
        .send({
          text: "New reply test",
          delete_password: "turtles",
          thread_id: String(idForReporting),
        })
        .end((err, res) => {
          assert.strictEqual(res.text, "success");
          done();
        });
    });

    test("viewing one thread with all replies via GET to /api/replies/{board}", (done) => {
      requester
        .get("/api/replies/b")
        .query({ thread_id: String(idForReporting) })
        .end((err, res) => {
          assert.isArray(res.body.replies);
          assert.isAbove(res.body.replies.length, 1);
          assert.notProperty(res.body, "delete_password");
          assert.notProperty(res.body, "reported");
          done();
        });
    });

    test("deleting a reply with incorrect password fails via DELETE to /api/replies/{board}", (done) => {
      requester
        .delete("/api/replies/b")
        .send({
          thread_id: String(idForReporting),
          reply_id: String(replyIdForDeletion),
          delete_password: "pwd4",
        })
        .end((err, res) => {
          assert.strictEqual(res.text, "incorrect password");
          done();
        });
    });
    test("deleting a reply with correct password succeeds via DELETE to /api/replies/{board}", (done) => {
      requester
        .delete("/api/replies/b")
        .send({
          thread_id: String(idForReporting),
          reply_id: String(replyIdForDeletion),
          delete_password: replyPwdForDeletion,
        })
        .end((err, res) => {
          assert.strictEqual(res.text, "success");
          done();
        });
    });
    test("reporting a reply succeeds via PUT to /api/replies/{board}", (done) => {
      requester
        .put("/api/replies/b")
        .send({
          thread_id: String(idForReporting),
          reply_id: String(replyIdForReporting),
        })
        .end((err, res) => {
          assert.strictEqual(res.text, "reported");
          done();
        });
    });
  });
});
