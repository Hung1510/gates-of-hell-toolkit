import { useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate, Navigate } from "react-router-dom";
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
import { WeaponsPage } from "./pages/WeaponsPage";
import { OpenDataPage } from "./pages/OpenDataPage";
import { CounterFinderPage } from "./pages/CounterFinderPage";
import { SquadCounterFinderPage } from "./pages/SquadCounterFinderPage";
import { TechPathFinderPage } from "./pages/TechPathFinderPage";
import { GlobalSearch } from "./components/GlobalSearch";
import { FavoritesPage } from "./pages/FavoritesPage";
import { WeaponComparePage } from "./pages/WeaponComparePage";
import "./styles.css";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Gates of Hell Toolkit",
  "/browse": "Browse Units & Squads - Gates of Hell Toolkit",
  "/builder": "Squad & Tech-Tree Builder - Gates of Hell Toolkit",
  "/compare": "Squad Comparison - Gates of Hell Toolkit",
  "/tech-tree": "Tech Tree - Gates of Hell Toolkit",
  "/tech-path": "Tech Path Finder - Gates of Hell Toolkit",
  "/vehicles": "Vehicles - Gates of Hell Toolkit",
  "/armor-vs-gun": "Armor vs Gun - Gates of Hell Toolkit",
  "/best-counter": "Best Counter Finder - Gates of Hell Toolkit",
  "/squad-counter": "Squad Best Counter Finder - Gates of Hell Toolkit",
  "/weapons": "Weapons Browser - Gates of Hell Toolkit",
  "/weapon-compare": "Weapon Comparison - Gates of Hell Toolkit",
  "/favorites": "Favorites - Gates of Hell Toolkit",
  "/save-editor": "Conquest Save Editor - Gates of Hell Toolkit",
  "/ask-the-mod": "Ask the Mod - Gates of Hell Toolkit",
  "/open-data": "Open Data - Gates of Hell Toolkit",
  "/about": "About - Gates of Hell Toolkit",
};

function DocumentTitle() {
  const location = useLocation();
  useEffect(() => {
    document.title = ROUTE_TITLES[location.pathname] ?? "Gates of Hell Toolkit";
  }, [location.pathname]);
  return null;
}

function HomeRoute() {
  const navigate = useNavigate();
  return <HomePage onNavigate={(p) => navigate(p)} />;
}

function AppShell() {
  return (
    <div className="app">
      <DocumentTitle />
      <header>
        <h1>Gates of Hell Toolkit</h1>
        <p className="subtitle">Unit database, squad/tech-tree builder, comparison, save editor, and query search — real .set game data</p>
        <GlobalSearch />
        <nav className="main-nav">
          <NavLink to="/" end className={({ isActive }: { isActive: boolean }) => (isActive ? "active" : "")}>
            Home
          </NavLink>
          <NavLink to="/browse" className={({ isActive }: { isActive: boolean }) => (isActive ? "active" : "")}>
            Browse
          </NavLink>
          <NavLink to="/builder" className={({ isActive }: { isActive: boolean }) => (isActive ? "active" : "")}>
            Builder
          </NavLink>
          <NavLink to="/compare" className={({ isActive }: { isActive: boolean }) => (isActive ? "active" : "")}>
            Compare
          </NavLink>
          <NavLink to="/squad-counter" className={({ isActive }: { isActive: boolean }) => (isActive ? "active" : "")}>
            Squad Counter
          </NavLink>
          <NavLink to="/tech-tree" className={({ isActive }: { isActive: boolean }) => (isActive ? "active" : "")}>
            Tech Tree
          </NavLink>
          <NavLink to="/tech-path" className={({ isActive }: { isActive: boolean }) => (isActive ? "active" : "")}>
            Tech Path
          </NavLink>
          <NavLink to="/vehicles" className={({ isActive }: { isActive: boolean }) => (isActive ? "active" : "")}>
            Vehicles
          </NavLink>
          <NavLink to="/armor-vs-gun" className={({ isActive }: { isActive: boolean }) => (isActive ? "active" : "")}>
            Armor vs Gun
          </NavLink>
          <NavLink to="/best-counter" className={({ isActive }: { isActive: boolean }) => (isActive ? "active" : "")}>
            Best Counter
          </NavLink>
          <NavLink to="/weapons" className={({ isActive }: { isActive: boolean }) => (isActive ? "active" : "")}>
            Weapons
          </NavLink>
          <NavLink to="/weapon-compare" className={({ isActive }: { isActive: boolean }) => (isActive ? "active" : "")}>
            Weapon Compare
          </NavLink>
          <NavLink to="/favorites" className={({ isActive }: { isActive: boolean }) => (isActive ? "active" : "")}>
            Favorites
          </NavLink>
          <NavLink to="/save-editor" className={({ isActive }: { isActive: boolean }) => (isActive ? "active" : "")}>
            Save Editor
          </NavLink>
          <NavLink to="/ask-the-mod" className={({ isActive }: { isActive: boolean }) => (isActive ? "active" : "")}>
            Ask the Mod
          </NavLink>
          <NavLink to="/open-data" className={({ isActive }: { isActive: boolean }) => (isActive ? "active" : "")}>
            Open Data
          </NavLink>
          <NavLink to="/about" className={({ isActive }: { isActive: boolean }) => (isActive ? "active" : "")}>
            About
          </NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/browse" element={<SquadsPage />} />
          <Route path="/builder" element={<BuilderPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/squad-counter" element={<SquadCounterFinderPage />} />
          <Route path="/tech-tree" element={<TechTreePage />} />
          <Route path="/tech-path" element={<TechPathFinderPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/armor-vs-gun" element={<VehicleComparePage />} />
          <Route path="/best-counter" element={<CounterFinderPage />} />
          <Route path="/weapons" element={<WeaponsPage />} />
          <Route path="/weapon-compare" element={<WeaponComparePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/save-editor" element={<SaveEditorPage />} />
          <Route path="/ask-the-mod" element={<AskPage />} />
          <Route path="/open-data" element={<OpenDataPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <p>
          Unofficial fan-made toolkit for <em>Call to Arms: Gates of Hell</em>. Not affiliated
          with or endorsed by Digitalmindsoft.
        </p>
        <p>
          <a href="https://github.com/Hung1510/gates-of-hell-toolkit" target="_blank" rel="noreferrer">
            GitHub
          </a>
          {" · "}
          <a
            href="https://github.com/Hung1510/gates-of-hell-toolkit/issues/new?labels=data-issue&title=Data%20issue%3A%20&body=What%20looks%20wrong%3A%0A%0AWhere%20you%20saw%20it%20(page%2C%20faction%2C%20unit%2Fvehicle%2Fweapon%20id)%3A%0A%0AWhat%20you%20expected%20instead%20(if%20known)%3A%0A"
            target="_blank"
            rel="noreferrer"
          >
            Report a data issue
          </a>
        </p>
      </footer>
      <Analytics />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
