const request = require("supertest");
const app = require("../service");

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

describe("orderRouter tests", () => {
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
    expect(typeof adminUserAuthToken).toBe("string");
  });

  test("list menu", async () => {
    const listres = await request(app).get("/api/order/menu");
    expect(listres.status).toBe(200);
  });

  test("add menu item", async () => {
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

    const res2 = await request(app)
      .put("/api/order/menu")
      .set("Authorization", `Bearer ${adminUserAuthToken}`)
      .send({
        title: "Student",
        description: "No topping, no sauce, just carbs",
        image: "pizza9.png",
        price: 0.0001,
      });
    expect(res2.status).toBe(200);
  });

  test("create order", async () => {
    const res = await request(app)
      .post("/api/order")
      .set("Authorization", `Bearer ${adminUserAuthToken}`)
      .send({
        franchiseId: 3,
        storeId: 8,
        items: [{ menuId: 1, description: "Veggie", price: 0.05 }],
      });
    expect(res.status).toBe(200);
  });

  /*
    test("list orders", async () => {
    const user = getDinerUser();
    const loginRes = await request(app).put("/api/auth").send(user);
    const token = loginRes.body.token;

    const res = await request(app)
        .get("/api/order")
        .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    });
    */

  function getRandom() {
    return Math.random().toString(36).substring(2, 12);
  }
});
