import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RequesterProvider } from "./context/RequesterContext.js";
import RequesterSelection from "./pages/RequesterSelection.js";
import RequireRequester from "./pages/RequireRequester.js";
import MyTicketsPlaceholder from "./pages/MyTicketsPlaceholder.js";
import CreateTicket from "./pages/CreateTicket.js";
import HealthCheck from "./pages/HealthCheck.js";

export default function App() {
  return (
    <RequesterProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RequesterSelection />} />
          <Route path="/health" element={<HealthCheck />} />
          <Route element={<RequireRequester />}>
            <Route path="/tickets" element={<MyTicketsPlaceholder />} />
            <Route path="/create-ticket" element={<CreateTicket />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </RequesterProvider>
  );
}