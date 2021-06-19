const { TOKEN_SECRET } = process.env; // 30 days by seconds
const jwt = require("jsonwebtoken");

const authentication = () => {
    return async function (req, res, next) {
        let accessToken = req.get("Authorization");
        if (!accessToken) {
            res.status(401).send({ error: "Unauthorized" });
            return;
        }

        accessToken = accessToken.replace("Bearer ", "");
        if (accessToken === "null") {
            res.status(401).send({ error: "Unauthorized" });
            return;
        }

        try {
            const user = jwt.verify(accessToken, TOKEN_SECRET);
            req.user = user;
            next();
        } catch (err) {
            res.status(403).send({ error: "Forbidden" });
        }
    };
};

module.exports = {
    authentication
};
