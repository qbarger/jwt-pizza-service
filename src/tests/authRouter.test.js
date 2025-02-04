const request = require("supertest");
const app = require("../service");

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

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

beforeEach(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  expect(typeof testUserAuthToken).toBe("string");

  adminUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes2 = await request(app).post("/api/auth").send(adminUser);
  adminUserAuthToken = registerRes2.body.token;
});

test("register", async () => {
  const user = createUser();
  const registerRes = await request(app).post("/api/auth").send(user);
  expect(registerRes.status).toBe(200);
});

test("login", async () => {
  const loginRes = await request(app).put("/api/auth").send(testUser);
  expect(loginRes.status).toBe(200);

  const expectedUser = { ...testUser, roles: [{ role: "diner" }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test("update user", async () => {
  const loginRes = await request(app).put("/api/auth").send(adminUser);
  adminUserAuthToken = loginRes.body.token;

  const updateRes = await request(app)
    .put(`/api/auth/${loginRes.body.user.id}`)
    .set("Authorization", `Bearer ${adminUserAuthToken}`)
    .send(adminUser);
  expect(updateRes.status).toBe(200);
});

test("logout", async () => {
  const loginRes = await request(app).put("/api/auth").send(testUser);
  const token = loginRes.body.token;

  const logoutRes = await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${token}`);
  expect(logoutRes.status).toBe(200);
  const resMessage = JSON.stringify(logoutRes.body.message);
  expect(resMessage).toBe('"logout successful"');
});

function createUser() {
  const user = { name: "pizza diner", email: "reg@test.com", password: "a" };
  user.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  return user;
}
