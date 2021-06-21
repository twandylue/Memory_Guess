const server = require("../app");
const chai = require("chai");
const chaiHttp = require("chai-http");
const { NODE_ENV } = process.env;
const { truncateFakeData, createFakeData } = require("./fake_data_generator");
const assert = chai.assert;

// Start server for socket testing
const port = 3001;
server.listen(port, function () { console.log(`start test server at port ${port}`); });

chai.use(chaiHttp);
const requester = chai.request(server).keepOpen();

before(async () => {
    if (NODE_ENV !== "test") {
        throw new Error("Not in test env");
    }

    await truncateFakeData();
    await createFakeData();
});

module.exports = {
    assert,
    requester
};
