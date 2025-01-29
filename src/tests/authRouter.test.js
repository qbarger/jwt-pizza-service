const request = require("supertest");
const app = require("../service");
const { json } = require("express");

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;

beforeEach(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test("register", async () => {
  const user = createUser();
  const registerRes = await request(app).post("/api/auth").send(user);
  expect(registerRes.status).toBe(200);
});

test("login", async () => {
  const loginRes = await request(app).put("/api/auth").send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: "diner" }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test("update user", async () => {
  const adminUser = {
    name: "常用名字",
    email: "a@jwt.com",
    password: "admin",
    roles: [{ role: "admin" }],
  };
  const loginRes = await request(app).put("/api/auth").send(adminUser);
  const token = loginRes.body.token;

  const updateRes = await request(app)
    .put(`/api/auth/${loginRes.body.user.id}`)
    .set("Authorization", `Bearer ${token}`)
    .send(adminUser);
  expect(updateRes.status).toBe(200);
  expect(updateRes.body.name).toBe("常用名字");
  expect(updateRes.body.email).toBe("a@jwt.com");
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

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(
    /^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/
  );
}

function createUser() {
  const user = { name: "pizza diner", email: "reg@test.com", password: "a" };
  user.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  return user;
}
