import { useState } from "react";
import { checkSystem, Category } from "../api.js";

type UiState = "idle" | "loading" | "success" | "error";

export default function HealthCheck() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleCheck() {
    setState("loading");
    try {
      const res = await checkSystem();
      setState("success");
      setCategories(res.categories);
    } catch (error) {
      setState("error");
      setErrorMsg("Unable to connect to TokTickIT API");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "success" && (
        <>
          <p>System Status: Online</p>
          <ol>
            {categories.map((cat) => (
              <li key={cat.id}>{cat.name}</li>
            ))}
          </ol>
        </>
      )}
      {state === "error" && (
        <p>
          System Status: Offline <br /> {errorMsg}
        </p>
      )}
    </div>
  );
}
