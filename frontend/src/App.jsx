// src/App.jsx
import { BrowserRouter } from "react-router-dom";
import AppRouter from "./core/routes/AppRouter.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
