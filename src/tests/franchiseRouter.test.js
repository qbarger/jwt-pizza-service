const request = require("supertest");
const app = require("../service");

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

describe("authRouter tests", () => {
  const adminUser = {
    name: "常用名字",
    email: "a@jwt.com",
    password: "admin",
    roles: [{ role: "admin" }],
  };
  let adminUserAuthToken;

  beforeAll(async () => {
    const loginRes = await request(app).put("/api/auth").send(adminUser);
    adminUserAuthToken = loginRes.body.token;
    //expectValidJwt(adminUserAuthToken);
  });

  test("list franchises", async () => {
    const res = await request(app).get("/api/franchise");
    expect(res.status).toBe(200);
  });

  test("create franchise no admin", async () => {
    const user = getDinerUser();
    const loginRes = await request(app).put("/api/auth").send(user);
    const token = loginRes.body.token;
    const res = await request(app)
      .post("/api/franchise")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "pizzaPocket", admins: [{ email: user.email }] });
    expect(res.status).toBe(403);
  });

  test("create franchise", async () => {
    const random = getRandom();
    const res = await request(app)
      .post("/api/franchise")
      .set("Authorization", `Bearer ${adminUserAuthToken}`)
      .send({
        name: `pizzaPocket${random}`,
        admins: [{ email: adminUser.email }],
      });
    expect(res.status).toBe(200);
  });

  test("create store", async () => {
    const random = getRandom();
    const franchiseId = 3;
    const storeRes = await request(app)
      .post(`/api/franchise/${franchiseId}/store`)
      .set("Authorization", `Bearer ${adminUserAuthToken}`)
      .send({ name: `pizzaStore${random}` });
    expect(storeRes.status).toBe(200);
  });

  test("delete franchise", async () => {
    const random = getRandom();
    const createRes = await request(app)
      .post("/api/franchise")
      .set("Authorization", `Bearer ${adminUserAuthToken}`)
      .send({
        name: `pizzaPocket${random}`,
        admins: [{ email: adminUser.email }],
      });
    expect(createRes.status).toBe(200);

    const deleteRes = await request(app)
      .delete("/api/franchise/1")
      .set("Authorization", `Bearer ${adminUserAuthToken}`);
    expect(deleteRes.status).toBe(200);
  });

  /*
  test("delete franchise no admin", async () => {
    const dinerUser = getDinerUser();
    const dinerLoginRes = await request(app).put("/api/auth").send(dinerUser);
    const dinerToken = dinerLoginRes.body.token;

    const deleteRes = await request(app)
      .delete("/api/franchise/15")
      .set("Authorization", `Bearer ${dinerToken}`);
    expect(deleteRes.status).toBe(403);
  });
  */

  test("list user's franchises", async () => {
    const res = await request(app)
      .get("/api/franchise/1")
      .set("Authorization", `Bearer ${adminUserAuthToken}`);
    expect(res.status).toBe(200);
  });

  function getRandom() {
    return Math.random().toString(36).substring(2, 12);
  }

  function getDinerUser() {
    return { name: "pizza diner", email: "06h7dpuwd8@test.com", password: "a" };
  }
});
