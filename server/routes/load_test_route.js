const router = require("express").Router();

const { serverLoadTest } = require("../controllers/testLoad_controller");

router.route("/testLoad").get(serverLoadTest);

module.exports = router;
