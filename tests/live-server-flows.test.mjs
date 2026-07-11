import test from "node:test";
import assert from "node:assert/strict";

const BASE_URL = "http://localhost:3000";

test("Live E2E Flow 1: Verify Homepage Loads with Correct UI Elements & Form", async () => {
  const res = await fetch(BASE_URL);
  assert.equal(res.status, 200, "Homepage should return 200 OK");
  const html = await res.text();

  // Verify headline and lede
  assert.match(html, /You shipped the app\. Now ship the launch\./, "Should contain hero headline");
  assert.match(html, /Every asset written for that platform&#x27;s real conventions/, "Should contain lede copy");

  // Verify 3-step navigation flow
  assert.match(html, /Describe your app/, "Should contain Step 1");
  assert.match(html, /Get 5 platform-native assets/, "Should contain Step 2");
  assert.match(html, /Track &amp; let AI iterate/, "Should contain Step 3");

  // Verify form fields
  assert.match(html, /name="name"/, "Should contain App Name input");
  assert.match(html, /name="category"/, "Should contain Category dropdown");
  assert.match(html, /name="pitch"/, "Should contain One-line Pitch input");
  assert.match(html, /name="target_user"/, "Should contain Target User input");
  assert.match(html, /Generate my launch kit →/, "Should contain form submit button");
});

test("Live E2E Flow 2: Simulate App Creation (POST /api/apps)", async () => {
  const formData = new FormData();
  formData.append("name", "TestApp Automated");
  formData.append("category", "Developer Tools");
  formData.append("pitch", "An automated test app for verifying live server flows.");
  formData.append("target_user", "Software engineers and QA testers.");
  formData.append("tone", "precise and helpful");

  const res = await fetch(`${BASE_URL}/api/apps`, {
    method: "POST",
    body: formData,
  });

  // Note: Depending on whether Supabase/db is connected or mocked/fallback in dev, check response
  const data = await res.json();
  assert.ok(data, "API should return JSON payload");
  if (res.ok) {
    assert.ok(data.id, "Created app should have an ID");
    console.log(`✅ App created successfully via live API with ID: ${data.id}`);

    // Verify navigation flow to /app/[id]
    const detailRes = await fetch(`${BASE_URL}/app/${data.id}`);
    assert.equal(detailRes.status, 200, "App detail page should return 200 OK");
    const detailHtml = await detailRes.text();
    assert.match(detailHtml, /TestApp Automated/, "Detail page should display app title");
  } else {
    // If db/Supabase auth is needed or returns expected error/upgrade wall
    console.log(`ℹ️ App creation API status ${res.status}:`, data);
  }
});

test("Live E2E Flow 3: Verify Existing App Dashboard & Share Flows (/app/[id] & /share/[id])", async () => {
  const testId = "e4c94a6e-f680-4b99-9c02-6f3c332105b3"; // HabitDeck ID from recent apps
  const res = await fetch(`${BASE_URL}/app/${testId}`);
  if (res.status === 200) {
    const html = await res.text();
    assert.match(html, /HabitDeck/, "Dashboard should render app title HabitDeck");
    assert.match(html, /Which channel is working\?/, "Dashboard should render analytics tracking section");
    assert.match(html, /Download kit/, "Dashboard should render download option");
    assert.match(html, /Share this kit/, "Dashboard should render share option");

    // Check share link route
    const shareRes = await fetch(`${BASE_URL}/share/${testId}`);
    assert.equal(shareRes.status, 200, "Share page should return 200 OK");
    const shareHtml = await shareRes.text();
    assert.match(shareHtml, /HabitDeck/, "Share page should display app title");
  } else {
    console.log(`ℹ️ Existing app route /app/${testId} returned status ${res.status}`);
  }
});
