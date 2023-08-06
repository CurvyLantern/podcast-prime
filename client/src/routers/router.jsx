import { createBrowserRouter } from "react-router-dom";
import RootLayout from "@/layouts/RootLayout";
import HomePage from "@/pages/HomePage";
import ChannelPage from "@/pages/ChannelPage";

const router = createBrowserRouter([
  {
    path: "",
    element: <RootLayout />,

    children: [
      {
        path: "/",
        element: <HomePage />,
      },
      {
        path: "/channel",
        element: <ChannelPage />,
      },
    ],
  },
]);

export default router;
