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
import Constancias from "./pages/Constancias";
import Usuarios from "./pages/Usuarios";

import MisEnviosAutor from "./pages/autor/MisEnviosAutor"; // ✅ AUTOR (sin PrivateLayout)

import PrivateLayout from "./layout/PrivateLayout";
import MisAsignacionesDictaminador from "./pages/dictaminador/MisAsignacionesDictaminador";




export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Público */}
        <Route path="/login" element={<Login />} />

        {/* AUTOR (sin PrivateLayout de admin) */}
        <Route path="/autor/mis-envios" element={<MisEnviosAutor />} />
        <Route path="/dictaminador" element={<MisAsignacionesDictaminador />} />



        {/* ADMIN (editorial) - todo protegido por PrivateLayout */}
        <Route path="/" element={<PrivateLayout><Dashboard /></PrivateLayout>} />
        <Route path="/convocatorias" element={<PrivateLayout><Convocatorias /></PrivateLayout>} />
        <Route path="/libros" element={<PrivateLayout><Libros /></PrivateLayout>} />
        <Route path="/capitulos" element={<PrivateLayout><Capitulos /></PrivateLayout>} />
        <Route path="/capitulos/:id" element={<PrivateLayout><CapituloDetalle /></PrivateLayout>} />

        <Route path="/dictamenes" element={<PrivateLayout><Dictamenes /></PrivateLayout>} />
        <Route path="/dictamenes/:id" element={<PrivateLayout><DictamenDetalle /></PrivateLayout>} />

        <Route path="/constancias" element={<PrivateLayout><Constancias /></PrivateLayout>} />
        <Route path="/usuarios" element={<PrivateLayout><Usuarios /></PrivateLayout>} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
