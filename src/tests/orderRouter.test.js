const request = require("supertest");
const app = require("../service");
const DB = require("../database/database");
const { Role } = require("../model/model");

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

let adminUser;
let adminUserAuthToken;

async function createAdminUser() {
  let user = { password: "toomanysecrets", roles: [{ role: Role.Admin }] };
  user.name = "admin" + getRandom();
  user.email = user.name + "@admin.com";

  await DB.DB.addUser(user);
  user.password = "toomanysecrets";

  return user;
}

beforeAll(async () => {
  adminUser = await createAdminUser();
  const loginRes = await request(app).put("/api/auth").send(adminUser);
  adminUserAuthToken = loginRes.body.token;
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
  const random = getRandom();
  const res1 = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${adminUserAuthToken}`)
    .send({
      name: `pizzaPocket${random}`,
      admins: [{ email: adminUser.email }],
    });
  expect(res1.status).toBe(200);

  const random2 = getRandom();
  const franchiseId = res1.body.id;
  const storeRes = await request(app)
    .post(`/api/franchise/${franchiseId}/store`)
    .set("Authorization", `Bearer ${adminUserAuthToken}`)
    .send({ name: `pizzaStore${random2}` });
  expect(storeRes.status).toBe(200);

  const res2 = await request(app)
    .put("/api/order/menu")
    .set("Authorization", `Bearer ${adminUserAuthToken}`)
    .send({
      title: "Veggie Pizza",
      description: "Veggie",
      image: "pizza9.png",
      price: 0.05,
    });
  expect(res2.status).toBe(200);

  const res3 = await request(app)
    .post("/api/order")
    .set("Authorization", `Bearer ${adminUserAuthToken}`)
    .send({
      franchiseId: franchiseId,
      storeId: storeRes.body.id,
      items: [{ menuId: 1, description: "Veggie", price: 0.05 }],
    });
  expect(res3.status).toBe(200);
});

function getRandom() {
  return Math.random().toString(36).substring(2, 12);
}
