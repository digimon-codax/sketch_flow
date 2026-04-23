import fs from "fs";
import path from "path";

async function run() {
  console.log("1. Authenticating...");
  const loginRes = await fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test@test.com", password: "123456" }),
  });
  const { token } = await loginRes.json();
  const headers = { Authorization: `Bearer ${token}` };

  const diagramId = "69ea3dfabaeb01c35abadfb2"; // from earlier test
  const elementId = "test-el-123";
  const baseUrl = `http://localhost:3001/api/context/${diagramId}/${elementId}`;

  console.log("\n2. PATCH notes");
  const patchRes = await fetch(baseUrl, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ notes: "Here are some important context notes." }),
  });
  console.log(await patchRes.json());

  console.log("\n3. GET context item");
  const getRes = await fetch(baseUrl, { headers });
  const item = await getRes.json();
  console.log(item);

  console.log("\n4. POST file upload");
  // Create a dummy file
  const testFilePath = path.join(process.cwd(), "test.txt");
  fs.writeFileSync(testFilePath, "Hello world test file.");
  
  const fileBlob = new Blob([fs.readFileSync(testFilePath)], { type: "text/plain" });
  const formData = new FormData();
  formData.append("file", fileBlob, "test.txt");

  const uploadRes = await fetch(`${baseUrl}/files`, {
    method: "POST",
    headers, // Don't set Content-Type with FormData, fetch does it automatically with boundary
    body: formData,
  });
  const uploaded = await uploadRes.json();
  console.log(uploaded);
  const fileId = uploaded.files[0]._id;

  console.log("\n5. GET to see file in list");
  const getRes2 = await fetch(baseUrl, { headers });
  console.log(await getRes2.json());

  console.log("\n6. DELETE the file");
  const delRes = await fetch(`${baseUrl}/files/${fileId}`, {
    method: "DELETE",
    headers,
  });
  console.log(await delRes.json());

  console.log("\n7. GET to confirm file is gone");
  const getRes3 = await fetch(baseUrl, { headers });
  console.log(await getRes3.json());

  // Cleanup
  fs.unlinkSync(testFilePath);
}

run().catch(console.error);
