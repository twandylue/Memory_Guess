const router = require("express").Router();

const { getLobbyInfo } = require("../controllers/lobby_controller");

router.route("/lobbyinfo").get(getLobbyInfo);

module.exports = router;
