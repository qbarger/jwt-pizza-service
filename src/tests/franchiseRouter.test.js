const request = require("supertest");
const app = require("../service");

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

describe("franchiseRouter tests", () => {
  const testUser = {
    name: "pizza diner",
    email: "reg@test.com",
    password: "a",
  };
  let testUserAuthToken;

  const adminUser = {
    id: 1,
    name: "常用名字",
    email: "a@jwt.com",
    password: "admin",
    roles: [{ role: "admin" }],
  };
  let adminUserAuthToken;

  beforeAll(async () => {
    testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
    const registerRes = await request(app).post("/api/auth").send(testUser);
    testUserAuthToken = registerRes.body.token;
    expect(typeof testUserAuthToken).toBe("string");

    const loginRes = await request(app).put("/api/auth").send(adminUser);
    if (loginRes.status !== 200) {
      registerAdmin();
    } else {
      adminUserAuthToken = loginRes.body.token;
    }
  });

  test("list franchises", async () => {
    const res = await request(app).get("/api/franchise");
    expect(res.status).toBe(200);
  });

  test("create franchise no admin", async () => {
    const loginRes = await request(app).put("/api/auth").send(testUser);
    const token = loginRes.body.token;
    const res = await request(app)
      .post("/api/franchise")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "pizzaPocket", admins: [{ email: testUser.email }] });
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
    const res = await request(app)
      .post("/api/franchise")
      .set("Authorization", `Bearer ${adminUserAuthToken}`)
      .send({
        name: `pizzaPocket${random}`,
        admins: [{ email: adminUser.email }],
      });
    expect(res.status).toBe(200);

    const random2 = getRandom();
    const franchiseId = res.body.id;
    const storeRes = await request(app)
      .post(`/api/franchise/${franchiseId}/store`)
      .set("Authorization", `Bearer ${adminUserAuthToken}`)
      .send({ name: `pizzaStore${random2}` });
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
      .delete(`/api/franchise/${adminUser.id}`)
      .set("Authorization", `Bearer ${adminUserAuthToken}`);
    expect(deleteRes.status).toBe(200);
  });

  test("list user's franchises", async () => {
    const res = await request(app)
      .get(`/api/franchise/${adminUser.id}`)
      .set("Authorization", `Bearer ${adminUserAuthToken}`);
    expect(res.status).toBe(200);
  });

  function getRandom() {
    return Math.random().toString(36).substring(2, 12);
  }

  async function registerAdmin() {
    const registerRes = await request(app).post("/api/auth").send(adminUser);
    adminUserAuthToken = registerRes.body.token;
  }
});
