import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import DashboardLayout from "./components/layouts/DashboardLayout";
// import PlaceholderPage from "./components/PlaceholderPage";
import LoginPage from "./pages/auth/LoginPage";
import DashboardHome from "./pages/dashboard/DashboardHome";
import LeaderboardPage from "./pages/gamification/LeaderboardPage";
import MyProgressPage from "./pages/gamification/MyProgressPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import PublicDashboard from "./pages/public/PublicDashboard";
import UsersPage from "./pages/users/UsersPage";
import MasterDataPage from "./pages/master-data/MasterDataPage";
import SkripsiPage from "./pages/skripsi/SkripsiPage";
import BimbinganPage from "./pages/skripsi/BimbinganPage";
import JadwalSidangPage from "./pages/skripsi/JadwalSidangPage";
import PeminjamanRuangPage from "./pages/skripsi/PeminjamanRuangPage";
import NilaiSidangPage from "./pages/skripsi/NilaiSidangPage";
import RevisiFinalisasiPage from "./pages/skripsi/RevisiFinalisasiPage";
import AuditLogsPage from "./pages/audit/AuditLogsPage";
import LaporanPage from "./pages/laporan/LaporanPage";
import SeminarReviewPage from "./pages/seminar/SeminarReviewPage";
import AssignPembimbingPage from "./pages/pembimbing/AssignPembimbingPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicDashboard />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />

              <Route 
                path="users" 
                element={<UsersPage />} 
              />
              <Route 
                path="master-data" 
                element={<MasterDataPage />} 
              />              
              <Route
                path="progress"
                element={<MyProgressPage />}
              />
              <Route
                path="leaderboard"
                element={<LeaderboardPage />}
              />
              <Route 
                path="skripsi" 
                element={<SkripsiPage />} 
              />
              <Route 
                path="seminar-review" 
                element={<SeminarReviewPage />} 
              />
              <Route 
                path="bimbingan"
                element={<BimbinganPage />} 
              />
              <Route 
                path="assign-pembimbing" 
                element={<AssignPembimbingPage />} 
              />
              <Route 
                path="jadwal-sidang" 
                element={<JadwalSidangPage />} 
              />
              <Route 
                path="nilai-sidang" 
                element={<NilaiSidangPage />} 
              />
              <Route 
                path="revisi-final" 
                element={<RevisiFinalisasiPage />} 
              />
              <Route 
                path="peminjaman-ruang" 
                element={<PeminjamanRuangPage />} 
              />
              <Route
                path="notifications"
                element={<NotificationsPage />}
              />
              <Route 
                path="audit-logs" 
                element={<AuditLogsPage />} 
              />
              <Route 
                path="laporan" 
                element={<LaporanPage />} 
              />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;