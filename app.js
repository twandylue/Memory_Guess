require("dotenv").config();
const { PORT, API_VERSION } = process.env;
const port = PORT;
const { REDISHOST } = process.env;
const path = require("path");
const cors = require("cors");
const redisAdapter = require("socket.io-redis");

// Express initialization
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const Server = require("socket.io").Server;
const io = new Server(server);
const { socket } = require("./server/controllers/socket_controller");
socket(io);

// for socket.io scaling
io.adapter(redisAdapter({ host: REDISHOST, port: 6379 }));

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// API routes
app.use("/api/" + API_VERSION,
    [
        require("./server/routes/user_route"),
        require("./server/routes/replay_route"),
        require("./server/routes/lobby_route")
    ]
);

app.get(["/", "/index.html"], (req, res) => {
    res.sendFile(path.join(__dirname, "/public/game_lobby.html"));
});

// Page not found
app.use(function (req, res, next) {
    res.status(404).sendFile(path.join(__dirname, "/public/404.html"));
    res.sendFile(path.join(__dirname, "/public/game_lobby.html"));
});

// Error handling
app.use(function (err, req, res, next) {
    console.log(err);
    res.status(500).send("Internal Server Error");
});

if (require.main === module) {
    server.listen(port, () => {
        console.log(`Server listening on port: ${port}`);
    });
}

module.exports = server;
