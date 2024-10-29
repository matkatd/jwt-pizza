import { Page } from "@playwright/test";
import { test, expect } from "playwright-test-coverage";

async function loginInterceptor(page: Page) {
  await page.route("*/**/api/auth", async (route) => {
    const loginReq = { email: "d@jwt.com", password: "a" };
    const loginRes = {
      user: {
        id: 3,
        name: "Kai Chen",
        email: "d@jwt.com",
        roles: [{ role: "diner" }],
      },
      token: "abcdef",
    };
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });
}

test("purchase with login", async ({ page }) => {
  await page.route("*/**/api/order/menu", async (route) => {
    const menuRes = [
      {
        id: 1,
        title: "Veggie",
        image: "pizza1.png",
        price: 0.0038,
        description: "A garden of delight",
      },
      {
        id: 2,
        title: "Pepperoni",
        image: "pizza2.png",
        price: 0.0042,
        description: "Spicy treat",
      },
    ];
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: menuRes });
  });

  await page.route("*/**/api/franchise", async (route) => {
    const franchiseRes = [
      {
        id: 2,
        name: "LotaPizza",
        stores: [
          { id: 4, name: "Lehi" },
          { id: 5, name: "Springville" },
          { id: 6, name: "American Fork" },
        ],
      },
      { id: 3, name: "PizzaCorp", stores: [{ id: 7, name: "Spanish Fork" }] },
      { id: 4, name: "topSpot", stores: [] },
    ];
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: franchiseRes });
  });

  loginInterceptor(page);

  await page.route("*/**/api/order", async (route) => {
    const method = route.request().method();
    if (method === "POST") {
      const orderReq = {
        items: [
          { menuId: 1, description: "Veggie", price: 0.0038 },
          { menuId: 2, description: "Pepperoni", price: 0.0042 },
        ],
        storeId: "4",
        franchiseId: 2,
      };
      const orderRes = {
        order: {
          items: [
            { menuId: 1, description: "Veggie", price: 0.0038 },
            { menuId: 2, description: "Pepperoni", price: 0.0042 },
          ],
          storeId: "4",
          franchiseId: 2,
          id: 23,
        },
        jwt: "eyJpYXQ",
      };
      expect(route.request().method()).toBe("POST");
      expect(route.request().postDataJSON()).toMatchObject(orderReq);
      await route.fulfill({ json: orderRes });
    } else if (method === "GET") {
      const orderHistoryRes = {
        id: "3",
        dinerId: "3",
        orders: [
          {
            id: "23",
            franchiseId: "2",
            storeId: "4",
            date: "2021-05-05",
            items: [
              { menuId: 1, description: "Veggie", price: 0.0038 },
              { menuId: 2, description: "Pepperoni", price: 0.0042 },
            ],
          },
        ],
      };
      expect(route.request().method()).toBe("GET");
      await route.fulfill({ json: orderHistoryRes });
    }
  });

  await page.goto("http://localhost:5173/");

  // Go to order page
  await page.getByRole("button", { name: "Order now" }).click();

  // Create order
  await expect(page.locator("h2")).toContainText("Awesome is a click away");
  await page.getByRole("combobox").selectOption("4");
  await page.getByRole("link", { name: "Image Description Veggie A" }).click();
  await page.getByRole("link", { name: "Image Description Pepperoni" }).click();
  await expect(page.locator("form")).toContainText("Selected pizzas: 2");
  await page.getByRole("button", { name: "Checkout" }).click();

  // Login
  await page.getByPlaceholder("Email address").click();
  await page.getByPlaceholder("Email address").fill("d@jwt.com");
  await page.getByPlaceholder("Email address").press("Tab");
  await page.getByPlaceholder("Password").fill("a");
  await page.getByRole("button", { name: "Login" }).click();

  // Pay
  await expect(page.getByRole("main")).toContainText(
    "Send me those 2 pizzas right now!"
  );
  await expect(page.locator("tbody")).toContainText("Veggie");
  await expect(page.locator("tbody")).toContainText("Pepperoni");
  await expect(page.locator("tfoot")).toContainText("0.008 ₿");
  await page.getByRole("button", { name: "Pay now" }).click();

  // Check balance
  await expect(page.getByText("0.008")).toBeVisible();

  await page.route("*/**/api/order/verify", async (route) => {
    const verify = { jwt: "eyJpYXQ" };
    const verifyRes = { message: "valid", payload: "eyJpYXQ" };
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toMatchObject(verify);
    await route.fulfill({ json: verifyRes });
  });

  // Verify order
  await expect(page.getByRole("button", { name: "Verify" })).toBeVisible();
  await page.getByRole("button", { name: "Verify" }).click();

  await page.getByRole("button", { name: "Close" }).click();

  // go to dashboard

  await page.getByRole("link", { name: "KC" }).click();
});

test("go to about page", async ({ page }) => {
  await page.goto("http://localhost:5173/");
  await page.getByRole("link", { name: "About" }).click();
  await expect(page.getByText("The secret sauce")).toBeVisible();
  await expect(page.getByRole("main").getByRole("img").first()).toBeVisible();
  await expect(page.getByText("JamesMariaAnnaBrian")).toBeVisible();
});

test("go to history page", async ({ page }) => {
  await page.goto("http://localhost:5173/");
  await page.getByRole("link", { name: "History" }).click();

  await expect(page.getByText("Mama Rucci, my my")).toBeVisible();
});

test("go to notFound page", async ({ page }) => {
  await page.goto("http://localhost:5173/404");
  await expect(page.getByText("Oops")).toBeVisible();
});

test("go to docs page", async ({ page }) => {
  await page.route("*/**/api/docs", async (route) => {
    const docsRes = {
      version: "1.0.0",
      endpoints: [
        {
          requiresAuth: false,
          method: "POST",
          path: "/api/auth",
          description: "Register a new user",
          example: `curl -X POST localhost:3000/api/auth -d '{"name":"pizza diner", "email":"d@jwt.com", "password":"diner"}' -H 'Content-Type: application/json'`,
          response: {
            user: {
              id: 2,
              name: "pizza diner",
              email: "d@jwt.com",
              roles: [{ role: "diner" }],
            },
            token: "tttttt",
          },
        },
        {
          requiresAuth: true,
          method: "GET",
          path: "/api/franchise",
          description: "Get all franchises",
          example: `curl -X GET localhost:3000/api/franchise -H 'Authorization Bearer tttttt'`,
          response: [
            {
              id: 2,
              name: "lotsa pizza",
              stores: [
                { id: 1, name: "Lehi", totalRevenue: 5000 },
                { id: 2, name: "Springville", totalRevenue: 3000 },
              ],
            },
          ],
        },
      ],
      config: {
        factory: "url.com",
        db: "host:port",
      },
    };
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: docsRes });
  });

  await page.goto("http://localhost:5173/docs");
  await page.getByText("JWT Pizza API").click();
  await expect(page.getByText("JWT Pizza API")).toBeVisible();
});

async function franchiseSetup(page: Page) {
  await page.route("*/**/api/auth", async (route) => {
    const loginReq = { email: "f@jwt.com", password: "b" };
    const loginRes = {
      user: {
        id: 3,
        name: "Kai Chen",
        email: "f@jwt.com",
        roles: [{ role: "franchisee" }],
      },
      token: "abcdef",
    };
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });

  await page.route("*/**/api/franchise/*", async (route) => {
    const franchiseRes = [
      {
        name: "lotsa pizza",
        admins: [{ name: "Kai Chen", email: "f@jwt.com", id: 3 }],
        id: 2,
        stores: [{ id: 1, name: "Lehi", totalRevenue: 5000 }],
      },
    ];
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: franchiseRes });
  });

  await page.goto("http://localhost:5173/");

  await page.getByRole("link", { name: "Franchise" }).first().click();
  await expect(page.locator("h2").first()).toContainText(
    "So you want a piece of the pie?"
  );
  await page.getByRole("link", { name: "login" }).first().click();

  await expect(page.getByText("Welcome back")).toBeVisible();
  // Login
  await page.getByRole("link", { name: "login" }).first().click();
  await page.getByPlaceholder("Email address").click();
  await page.getByPlaceholder("Email address").fill("f@jwt.com");
  await page.getByPlaceholder("Email address").press("Tab");
  await page.getByPlaceholder("Password").fill("b");
  await page.getByRole("button", { name: "Login" }).click();

  // goto franchise
  await page.getByRole("link", { name: "Franchise" }).first().click();
}

test("login as franchise owner", async ({ page }) => {
  franchiseSetup(page);

  await expect(
    page.getByRole("button", { name: "Create store" })
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "Lehi" })).toBeVisible();
});

test("create store", async ({ page }) => {
  // intercept create store
  await page.route("*/**/api/franchise/*/store", async (route) => {
    const createStoreReq = { name: "Provo" };
    const createStoreRes = {
      id: 2,
      name: "Provo",
      totalRevenue: 0,
    };
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toMatchObject(createStoreReq);
    await route.fulfill({ json: createStoreRes });
  });

  franchiseSetup(page);

  await expect(
    page.getByRole("button", { name: "Create store" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Create store" }).click();
  await page.getByPlaceholder("store name").click();
  await page.getByPlaceholder("store name").fill("Provo");
  await page.getByRole("button", { name: "Create" }).click();
  await page.getByRole("link", { name: "franchise-dashboard" }).click();
});

test("close store", async ({ page }) => {
  // intercept close store
  await page.route("*/**/api/franchise/*/store/*", async (route) => {
    console.log(route.request().url());

    expect(route.request().method()).toBe("DELETE");

    // Extract the franchise ID and store ID from the URL
    const url = route.request().url();

    const franchiseMatch = url?.match(/franchise\/(\d+)/);
    const franchiseId = franchiseMatch ? franchiseMatch[1] : null; // Extract franchise ID
    const storeMatch = url?.match(/store\/(\d+)/);
    const storeId = storeMatch ? storeMatch[1] : null; // Extract store ID

    // Check that the IDs are as expected
    expect(franchiseId).toBe("2"); // Replace with the expected franchise ID
    expect(storeId).toBe("1"); // Replace with the expected store ID

    // Respond with a 200 status code (success)
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  franchiseSetup(page);

  await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await page.waitForTimeout(200);
  await expect(page.getByText("Sorry to see you go")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await expect(page.getByRole("cell", { name: "Lehi" })).not.toBeVisible();
});

test("register as diner", async ({ page }) => {
  await page.route("*/**/api/auth", async (route) => {
    const method = route.request().method();

    if (method === "POST") {
      const registerReq = {
        email: "chris@jwt.com",
        password: "password",
      };
      const registerRes = {
        user: {
          id: 3,
          name: "Chris Mann",
          email: "chris@jwt.com",
          roles: [{ role: "diner" }],
        },
        token: "abcdef",
      };

      expect(route.request().method()).toBe("POST");
      expect(route.request().postDataJSON()).toMatchObject(registerReq);
      await route.fulfill({ json: registerRes });
    } else if (method === "GET") {
      const userRes = {
        id: 3,
        name: "Chris Mann",
        email: "chris@jwt.com",
        roles: [{ role: "diner" }],
      };
      expect(route.request().method()).toBe("GET");
      await route.fulfill({ json: userRes });
    }
  });

  await page.goto("http://localhost:5173/");
  await page.getByRole("link", { name: "Register" }).click();

  expect(page.locator("h2")).toContainText("Welcome to the party");
  await page.getByPlaceholder("Full name").click();
  await page.getByPlaceholder("Full name").fill("Chris Mann");
  await page.getByPlaceholder("Full name").press("Tab");
  await page.getByPlaceholder("Email address").fill("chris@jwt.com");
  await page.getByPlaceholder("Email address").press("Tab");
  await page.getByPlaceholder("Password").fill("password");
  await page.getByRole("button", { name: "Register" }).click();

  await expect(page.getByRole("link", { name: "CM" })).toBeVisible();
  await page.getByRole("link", { name: "Logout" }).click();
});

test("logout", async ({ page }) => {
  await page.route("*/**/api/auth", async (route) => {
    const method = route.request().method();

    if (method === "DELETE") {
      expect(route.request().method()).toBe("DELETE");
      // Respond with a 200 status code (success)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    } else if (method === "PUT") {
      const loginReq = { email: "d@jwt.com", password: "a" };
      const loginRes = {
        user: {
          id: 3,
          name: "Kai Chen",
          email: "d@jwt.com",
          roles: [{ role: "diner" }],
        },
        token: "abcdef",
      };
      expect(route.request().method()).toBe("PUT");
      expect(route.request().postDataJSON()).toMatchObject(loginReq);
      await route.fulfill({ json: loginRes });
    }
  });

  await page.goto("http://localhost:5173/");
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByPlaceholder("Email address").click();
  await page.getByPlaceholder("Email address").fill("d@jwt.com");
  await page.getByPlaceholder("Email address").press("Tab");
  await page.getByPlaceholder("Password").fill("a");
  await page.getByRole("button", { name: "Login" }).click();
  await page.getByRole("link", { name: "Logout" }).click();
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
});

async function setUpAdmin(page: Page) {
  await page.route("*/**/api/auth", async (route) => {
    const loginReq = { email: "a@jwt.com", password: "a" };
    const loginRes = {
      user: {
        id: 3,
        name: "Kai Chen",
        email: "a@jwt.com",
        roles: [{ role: "admin" }],
      },
      token: "abcdef",
    };
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });

  await page.goto("http://localhost:5173/");
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByPlaceholder("Email address").click();
  await page.getByPlaceholder("Email address").fill("a@jwt.com");
  await page.getByPlaceholder("Email address").press("Tab");
  await page.getByPlaceholder("Password").fill("a");
  await page.getByRole("button", { name: "Login" }).click();
}

test("login as admin", async ({ page }) => {
  setUpAdmin(page);
  await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
});

test("add franchise", async ({ page }) => {
  await page.route("*/**/api/franchise", async (route) => {
    const method = route.request().method();

    if (method === "POST") {
      const addFranchiseReq = { name: "DELTA pizza" };
      const addFranchiseRes = {
        id: 3,
        name: "DELTA pizza",
        stores: [],
      };
      expect(route.request().method()).toBe("POST");
      expect(route.request().postDataJSON()).toMatchObject(addFranchiseReq);
      await route.fulfill({ json: addFranchiseRes });
    } else if (method === "GET") {
      const franchiseRes = [
        {
          name: "lotsa pizza",
          admins: [{ name: "Kai Chen", email: "a@jwt.com", id: 3 }],
          id: 2,
          stores: [{ id: 1, name: "Lehi", totalRevenue: 5000 }],
        },
        {
          name: "PizzaCorp",
          admins: [{ name: "Kai Chen", email: "a@jwt.com", id: 3 }],
          id: 3,
          stores: [],
        },
      ];
      expect(route.request().method()).toBe("GET");
      await route.fulfill({ json: franchiseRes });
    }
  });

  setUpAdmin(page);
  await page.getByRole("link", { name: "Admin" }).click();
  await page.getByRole("button", { name: "Add franchise" }).click();
  await page.getByPlaceholder("franchise name").click();
  await page.getByPlaceholder("franchise name").fill("DELTA pizza");
  await page.getByPlaceholder("franchise name").press("Tab");
  await page.getByPlaceholder("franchisee admin email").fill("a@jwt.com");
  await page.getByRole("button", { name: "Create" }).click();
});

test("close franchise", async ({ page }) => {
  await page.route("*/**/api/franchise/*", async (route) => {
    expect(route.request().method()).toBe("DELETE");
    // Extract the franchise ID from the URL
    const url = route.request().url();
    const franchiseMatch = url?.match(/franchise\/(\d+)/);
    const franchiseId = franchiseMatch ? franchiseMatch[1] : null; // Extract franchise ID
    expect(franchiseId).toBe("2"); // Replace with the expected franchise ID

    // Respond with a 200 status code (success)
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route("*/**/api/franchise", async (route) => {
    const franchiseRes = [
      {
        name: "lotsa pizza",
        admins: [{ name: "Kai Chen", email: "a@jwt.com", id: 3 }],
        id: 2,
        stores: [{ id: 1, name: "Lehi", totalRevenue: 5000 }],
      },
      {
        name: "PizzaCorp",
        admins: [{ name: "Kai Chen", email: "a@jwt.com", id: 3 }],
        id: 3,
        stores: [],
      },
    ];
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: franchiseRes });
  });

  setUpAdmin(page);
  await page.getByRole("link", { name: "Admin" }).click();
  await page.getByRole("button", { name: "Close" }).first().click();

  await expect(page.getByText("Sorry to see you go")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(
    page.getByRole("cell", { name: "lotsa pizza" })
  ).not.toBeVisible();
});
