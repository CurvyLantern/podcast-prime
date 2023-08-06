import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./global.css";
import router from "@/routers/router";

const root = createRoot(document.getElementById("root"));

root.render(<RouterProvider router={router} />);
