const { getReplay } = require("../models/game_model");
const getReplayRecord = async (req, res) => {
    try {
        const { data } = req.body;
        const replayObj = await getReplay(parseInt(data));
        if (replayObj === 0) {
            res.status(200).send({ data: 0 }); // warning: "no history"
            return;
        }
        const names = replayObj.members.map((ele) => {
            return ele.name;
        });
        if (!names.includes(req.user.name)) {
            res.status(400).send({ error: "Permission denied" }); // 沒有權限
            return;
        }
        res.status(200).send({ data: { stepList: replayObj.stepList, members: replayObj.members, rules: replayObj.rules, cardsSetting: replayObj.cardsSetting, gameStatData: replayObj.gameStatData } });
        return;
    } catch (err) {
        console.log(err);
        res.status(400).send({ error: "wrong gameID" });
    }
};

module.exports = {
    getReplayRecord
};
