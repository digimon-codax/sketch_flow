import jwt from 'jsonwebtoken';
import fetch from 'node-fetch'; // Requires node-fetch or native fetch in node 18+

const JWT_SECRET = '370341610da978d73303343e605175b0295a71f506c0276850400055edc9f485';
const token = jwt.sign({ userId: 'test-user-123' }, JWT_SECRET);

async function test() {
  const res = await fetch('http://localhost:3001/api/ai/cleanup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      objects: [{"id":"abc","type":"rectangle","label":"User","x":50,"y":200,"width":120,"height":60}]
    })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

test().catch(console.error);
