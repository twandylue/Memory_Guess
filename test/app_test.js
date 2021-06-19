const io = require("socket.io-client");
const assert = require("assert");
const server = require("../app");
const port = 3001;

// Start server for testing
server.listen(port, function () { console.log(`start test server at port ${port}`); });

const socketURL = `http://localhost:${port}`;
const options = {
    auth: {
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcm92aWRlciI6Im5hdGl2ZSIsIm5hbWUiOiJoZW5yeSIsImVtYWlsIjoiaGVucnlfMTIzQGdtYWlsLmNvbSIsInBpY3R1cmUiOiJodHRwczovL21lbW9yeWd1ZXNzLnMzLmFwLW5vcnRoZWFzdC0xLmFtYXpvbmF3cy5jb20vdXNlcnBob3RvXzUuanBlZyIsInJvb21JRCI6ImhlbnJ5X3JvYm90X3Jvb20iLCJzdGF0dXMiOjEsImlhdCI6MTYyMzkyNDEzM30.BtVdewCZdUoFZ1NrrlmCYJs1zCfU2MjBdGQ4sOCOWpE"
    },
    transports: ["websocket"],
    "force new connection": true
};

describe("Chat Server", function () {
    it("Chat on lobby. Should broadcast new user to all users", function (done) {
        const client1 = io.connect(socketURL, options);
        const client2 = io.connect(socketURL, options);
        const client1SendMessage = "hi";
        client2.on("chat in lobby message", function (msg) {
            assert.equal(msg, "henryhi");
            client1.disconnect();
            client2.disconnect();
            done();
        });
        client1.emit("chat lobby message", client1SendMessage);
    });

    it("Get user info.", function (done) {
        const client = io.connect(socketURL, options);
        client.on("show my info", (info) => {
            assert.equal(info.name, "henry");
            assert.equal(info.email, "henry_123@gmail.com");
            client.disconnect();
            done();
        });
        client.emit("get user info", "");
    });
});

const Room = require("../server/models/room_model");
describe("Lobby info", function () {
    it("Get lobby info", async function () {
        const res = await Room.getRoomLobbyInfo();
        assert.equal(res.basicInfo[0].room_id, "666");
    });
});

// const User = require("../server/models/user_model");
// decribe("User model", function () {
//     it("Test sign up", async () => {
//         const name = "test";
//         const roleId = "1";
//         const email = "test@email.com";
//         const password = "test123";
//         const res = await User.signUp(name, roleId, email, password);
//         assert.equal(res, "test 看你回傳什麼東c");
//     });
// });
