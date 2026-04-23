import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Dashboard Placeholder</div>} />
        <Route path="/canvas/:id" element={<div>Canvas Placeholder</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
