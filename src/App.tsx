// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Convocatorias from "./pages/Convocatorias";
import Libros from "./pages/Libros";
import Capitulos from "./pages/Capitulos";
import CapituloDetalle from "./pages/CapituloDetalle";
import Dictamenes from "./pages/Dictamenes";
import DictamenDetalle from "./pages/DictamenDetalle";
import DictamenDocumento from "./pages/DictamenDocumento";
import Constancias from "./pages/Constancias";
import Usuarios from "./pages/Usuarios";
import MisEnviosAutor from "./pages/autor/MisEnviosAutor";
import MisAsignacionesDictaminador from "./pages/dictaminador/MisAsignacionesDictaminador";

import PrivateLayout from "./layout/PrivateLayout";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Público */}
        <Route path="/login" element={<Login />} />

        {/* AUTOR */}
        <Route path="/autor/mis-envios" element={<MisEnviosAutor />} />

        {/* DICTAMINADOR */}
        <Route path="/dictaminador" element={<MisAsignacionesDictaminador />} />

        {/* ADMIN (EDITORIAL) - TODO protegido por PrivateLayout (Outlet) */}
        <Route element={<PrivateLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/convocatorias" element={<Convocatorias />} />
          <Route path="/libros" element={<Libros />} />
          <Route path="/capitulos" element={<Capitulos />} />
          <Route path="/capitulos/:id" element={<CapituloDetalle />} />

          <Route path="/dictamenes" element={<Dictamenes />} />
          <Route path="/dictamenes/:id" element={<DictamenDetalle />} />
          <Route path="/dictamenes/:id/documento" element={<DictamenDocumento />} />

          <Route path="/constancias" element={<Constancias />} />
          <Route path="/usuarios" element={<Usuarios />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}