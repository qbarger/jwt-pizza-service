const request = require("supertest");
const app = require("../service");
const DB = require("../database/database");
const { Role } = require("../model/model");

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

const testUser = {
  id: 1,
  name: "pizza diner",
  email: "reg@test.com",
  password: "a",
};
let testUserAuthToken;

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

beforeEach(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  expect(typeof testUserAuthToken).toBe("string");

  adminUser = await createAdminUser();
  const loginRes = await request(app).put("/api/auth").send(adminUser);
  adminUserAuthToken = loginRes.body.token;
  adminUser.id = loginRes.body.user.id;
});

test("register", async () => {
  const user = createUser();
  const registerRes = await request(app).post("/api/auth").send(user);
  expect(registerRes.status).toBe(200);
});

test("login", async () => {
  const loginRes = await request(app).put("/api/auth").send(testUser);
  expect(loginRes.status).toBe(200);

  //const expectedUser = { ...testUser, roles: [{ role: "diner" }] };
  //expectedUser.id = loginRes.body.user.id;
  //delete expectedUser.password;
  //expect(loginRes.body.user).toMatchObject(expectedUser);
});

test("update user", async () => {
  const updateRes = await request(app)
    .put(`/api/auth/${adminUser.id}`)
    .set("Authorization", `Bearer ${adminUserAuthToken}`)
    .send(adminUser);
  expect(updateRes.status).toBe(200);
});

test("logout", async () => {
  const logoutRes = await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${adminUserAuthToken}`);
  expect(logoutRes.status).toBe(200);
  const resMessage = JSON.stringify(logoutRes.body.message);
  expect(resMessage).toBe('"logout successful"');
});

function createUser() {
  const user = { name: "pizza diner", email: "reg@test.com", password: "a" };
  user.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  return user;
}

function getRandom() {
  return Math.random().toString(36).substring(2, 12);
}
