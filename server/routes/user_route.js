const router = require("express").Router();

const {
    authentication
} = require("../../util/util");

const {
    signUp,
    signIn,
    getUserProfile,
    getUserRecord,
    getLeaderBoard
} = require("../controllers/user_controller");

router.route("/user/signup").post(signUp);

router.route("/user/signin").post(signIn);

router.route("/user/profile").get(authentication(), getUserProfile);

router.route("/user/record").get(authentication(), getUserRecord);

router.route("/user/leaderboard").get(authentication(), getLeaderBoard);

module.exports = router;
