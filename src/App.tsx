import { Routes, Route } from "react-router";
import AppShell from "@/components/AppShell";
import Home from "./pages/Home";
import Report from "./pages/Report";
import Locator from "./pages/Locator";
import MyReports from "./pages/MyReports";
import More from "./pages/More";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<Admin />} />
      <Route
        path="*"
        element={
          <AppShell>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/report" element={<Report />} />
              <Route path="/locator" element={<Locator />} />
              <Route path="/reports" element={<MyReports />} />
              <Route path="/more" element={<More />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppShell>
        }
      />
    </Routes>
  );
}
