import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/tailwind.css";
import "./styles/index.css";

console.log('index.jsx: Starting app initialization...');

const container = document.getElementById("root");
console.log('index.jsx: Root container found:', container);

if (!container) {
  console.error('index.jsx: Root container not found!');
} else {
  try {
    const root = createRoot(container);
    console.log('index.jsx: React root created successfully');
    root.render(<App />);
    console.log('index.jsx: App rendered successfully');
  } catch (error) {
    console.error('index.jsx: Error during render:', error);
  }
}
