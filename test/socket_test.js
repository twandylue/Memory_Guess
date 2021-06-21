const io = require("socket.io-client");
const assert = require("assert");
const port = 3001;
const socketURL = `http://localhost:${port}`;
const { requester } = require("./set_up");

describe("Chat Server", function () {
    it("Chat on lobby.", async function () {
        const user = {
            name: "andyTest",
            email: "andyTest@gmail.com",
            password: "password"
        };

        const res = await requester
            .post("/api/1.0/user/signup")
            .send(user);

        const options = {
            auth: {
                token: res.body.data.access_token
            },
            transports: ["websocket"],
            "force new connection": true
        };

        const client1 = io.connect(socketURL, options);
        const client2 = io.connect(socketURL, options);
        const client1SendMessage = "hi";
        client2.on("chat in lobby message", function (msg) {
            assert.equal(msg, "andyTesthi");
            client1.disconnect();
            client2.disconnect();
        });
        client1.emit("chat lobby message", client1SendMessage);
    });
    it("Get user info.", async function () {
        const user = {
            name: "andyTest",
            email: "andyTest@gmail.com",
            password: "password"
        };

        const res = await requester
            .post("/api/1.0/user/signin")
            .send(user);

        const options = {
            auth: {
                token: res.body.data.access_token
            },
            transports: ["websocket"],
            "force new connection": true
        };

        const client = io.connect(socketURL, options);
        client.on("show my info", (info) => {
            assert.equal(info.name, "andyTest");
            assert.equal(info.email, "andyTest@gmail.com");
            client.disconnect();
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
