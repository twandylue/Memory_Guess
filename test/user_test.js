require("dotenv").config();
const { assert, requester } = require("./set_up");
const { users } = require("./fake_data");
const { pool } = require("../server/models/mysqlcon");
const expectedExpireTime = process.env.TOKEN_EXPIRE;

describe("user", () => {
    /**
     * Sign Up
     */

    it("sign up", async () => {
        const user = {
            name: "andy",
            email: "andy@gmail.com",
            password: "password"
        };

        const res = await requester
            .post("/api/1.0/user/signup")
            .send(user);

        const data = res.body.data;

        const userExpect = {
            id: data.user.id, // need id from returned data
            provider: "native",
            name: user.name,
            email: user.email,
            picture: "/images/profile.jpeg"
        };

        assert.deepEqual(data.user, userExpect);
        assert.isString(data.access_token);
        assert.equal(data.access_expired, expectedExpireTime);
        assert.closeTo(new Date(data.login_at).getTime(), Date.now(), 1000);
    });

    it("sign up without name or email or password", async () => {
        const user1 = {
            email: "arthur@gmail.com",
            password: "password"
        };

        const res1 = await requester
            .post("/api/1.0/user/signup")
            .send(user1);

        assert.equal(res1.statusCode, 400);

        const user2 = {
            name: "arthur",
            password: "password"
        };

        const res2 = await requester
            .post("/api/1.0/user/signup")
            .send(user2);

        assert.equal(res2.statusCode, 400);

        const user3 = {
            name: "arthur",
            email: "arthur@gmail.com"
        };

        const res3 = await requester
            .post("/api/1.0/user/signup")
            .send(user3);

        assert.equal(res3.statusCode, 400);
    });

    it("sign up with existed email", async () => {
        const user = {
            name: users[0].name,
            email: users[0].email,
            password: "password"
        };

        const res = await requester
            .post("/api/1.0/user/signup")
            .send(user);

        assert.equal(res.body.error, "Email Already Exists");
    });

    it("sign up with malicious email", async () => {
        const user = {
            name: users[0].name,
            email: "<script>alert(1)</script>",
            password: "password"
        };

        const res = await requester
            .post("/api/1.0/user/signup")
            .send(user);

        assert.equal(res.body.error, "Request Error: Invalid email format");
    });

    // /**
    //  * Native Sign In
    //  */

    it("native sign in with correct password", async () => {
        const user1 = users[0];
        const user = {
            provider: user1.provider,
            email: user1.email,
            password: user1.password
        };

        const res = await requester
            .post("/api/1.0/user/signin")
            .send(user);

        const data = res.body.data;
        const userExpect = {
            provider: "native",
            name: user1.name,
            email: user1.email,
            picture: "/images/profile.jpeg"
        };

        assert.deepEqual(data.user, userExpect);
        assert.isString(data.access_token);
        assert.equal(data.access_expired, expectedExpireTime);

        // make sure DB is changed, too
        const loginTime = await pool.query(
            "SELECT login_at FROM user WHERE email = ?",
            [user.email]
        );

        assert.closeTo(new Date(data.login_at).getTime(), Date.now(), 1000);
        assert.closeTo(new Date(loginTime[0][0].login_at).getTime(), Date.now(), 2000);
    });

    it("native sign in without email or password", async () => {
        const user1 = users[0];
        const userNoEmail = {
            provider: user1.provider,
            password: user1.password
        };

        const res1 = await requester
            .post("/api/1.0/user/signin")
            .send(userNoEmail);

        assert.equal(res1.status, 400);
        assert.equal(res1.body.error, "Request Error: email and password are required.");

        const userNoPassword = {
            provider: user1.provider,
            email: user1.email
        };

        const res2 = await requester
            .post("/api/1.0/user/signin")
            .send(userNoPassword);

        assert.equal(res2.status, 400);
        assert.equal(res2.body.error, "Request Error: email and password are required.");
    });

    it("native sign in with wrong password", async () => {
        const user1 = users[0];
        const user = {
            provider: user1.provider,
            email: user1.email,
            password: "wrong password"
        };

        const res = await requester
            .post("/api/1.0/user/signin")
            .send(user);

        assert.equal(res.status, 403);
        assert.equal(res.body.error, "Password is wrong");
    });

    it("native sign in with malicious password", async () => {
        const user1 = users[0];
        const user = {
            provider: user1.provider,
            email: user1.email,
            password: "\" OR 1=1; -- "
        };

        const res = await requester
            .post("/api/1.0/user/signin")
            .send(user);

        assert.equal(res.status, 403);
        assert.equal(res.body.error, "Password is wrong");
    });

    /**
     * Get User Profile
     */

    it("get profile without access_token", async () => {
        const res = await requester
            .get("/api/1.0/user/profile");

        assert.equal(res.status, 401);
    });

    it("get profile with invalid access_token", async () => {
        const res = await requester
            .get("/api/1.0/user/profile")
            .set("Authorization", "Bearer wrong_token");

        assert.equal(res.status, 403);
    });

    after(() => {
        console.log("finished");
    });
});
