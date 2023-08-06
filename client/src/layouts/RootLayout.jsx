import { Outlet } from "react-router-dom";

const RootLayout = () => {
  return (
    <div className="h-full grid">
      <Outlet />
    </div>
  );
};

export default RootLayout;
