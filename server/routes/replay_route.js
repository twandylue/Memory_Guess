const router = require("express").Router();

const {
    authentication
} = require("../../util/util");

const { getReplayRecord } = require("../controllers/replay_controller");

router.route("/replayreocrd").post(authentication(), getReplayRecord);

module.exports = router;
