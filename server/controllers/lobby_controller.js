const Room = require("../models/room_model");
const getLobbyInfo = async (req, res) => {
    const info = await Room.getRoomLobbyInfo();
    res.status(200).send(info);
};

module.exports = {
    getLobbyInfo
};
