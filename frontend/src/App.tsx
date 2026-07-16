import { useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { HomePage } from "./pages/HomePage";
import { SquadsPage } from "./pages/SquadsPage";
import { BuilderPage } from "./pages/BuilderPage";
import { ComparePage } from "./pages/ComparePage";
import { TechTreePage } from "./pages/TechTreePage";
import { SaveEditorPage } from "./pages/SaveEditorPage";
import { AskPage } from "./pages/AskPage";
import { AboutPage } from "./pages/AboutPage";
import { VehiclesPage } from "./pages/VehiclesPage";
import { VehicleComparePage } from "./pages/VehicleComparePage";
import "./styles.css";

type Page = "home" | "browse" | "build" | "compare" | "techtree" | "vehicles" | "vehiclecompare" | "save" | "ask" | "about";

function App() {
  const [page, setPage] = useState<Page>("home");

  return (
    <div className="app">
      <header>
        <h1>Gates of Hell Toolkit</h1>
        <p className="subtitle">Unit database, squad/tech-tree builder, comparison, save editor, and query search — real .set game data</p>
        <nav className="main-nav">
          <button className={page === "home" ? "active" : ""} onClick={() => setPage("home")}>
            Home
          </button>
          <button className={page === "browse" ? "active" : ""} onClick={() => setPage("browse")}>
            Browse
          </button>
          <button className={page === "build" ? "active" : ""} onClick={() => setPage("build")}>
            Builder
          </button>
          <button className={page === "compare" ? "active" : ""} onClick={() => setPage("compare")}>
            Compare
          </button>
          <button className={page === "techtree" ? "active" : ""} onClick={() => setPage("techtree")}>
            Tech Tree
          </button>
          <button className={page === "vehicles" ? "active" : ""} onClick={() => setPage("vehicles")}>
            Vehicles
          </button>
          <button className={page === "vehiclecompare" ? "active" : ""} onClick={() => setPage("vehiclecompare")}>
            Armor vs Gun
          </button>
          <button className={page === "save" ? "active" : ""} onClick={() => setPage("save")}>
            Save Editor
          </button>
          <button className={page === "ask" ? "active" : ""} onClick={() => setPage("ask")}>
            Ask the Mod
          </button>
          <button className={page === "about" ? "active" : ""} onClick={() => setPage("about")}>
            About
          </button>
        </nav>
      </header>
      <main>
        {page === "home" && <HomePage onNavigate={(p) => setPage(p as Page)} />}
        {page === "browse" && <SquadsPage />}
        {page === "build" && <BuilderPage />}
        {page === "compare" && <ComparePage />}
        {page === "techtree" && <TechTreePage />}
        {page === "vehicles" && <VehiclesPage />}
        {page === "vehiclecompare" && <VehicleComparePage />}
        {page === "save" && <SaveEditorPage />}
        {page === "ask" && <AskPage />}
        {page === "about" && <AboutPage />}
      </main>
      <Analytics />
    </div>
  );
}

export default App;
