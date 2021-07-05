const { genMultiCardsNumber } = require("../models/card_model");
const serverLoadTest = (req, res) => {
    const cardInfo = genMultiCardsNumber(3000, 36);
    res.status(200).send(cardInfo);
};

module.exports = {
    serverLoadTest
};
