import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import DashboardLayout from "./components/layouts/DashboardLayout";
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
import PeminjamanRuangPage from "./pages/skripsi/PeminjamanRuangPage";
import AuditLogsPage from "./pages/audit/AuditLogsPage";
import LaporanPage from "./pages/laporan/LaporanPage";
import AssignPembimbingPage from "./pages/pembimbing/AssignPembimbingPage";
import RiwayatWorkflowSidangPage from "./pages/sidang/RiwayatWorkflowSidangPage";
import WorkflowDashboardPage from "./pages/dashboard/WorkflowDashboardPage";
import WorkflowSidangPage from "./pages/workflow/WorkflowSidangPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicDashboard />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<DashboardLayout />}>
            <Route path="workflow-dashboard" element={<WorkflowDashboardPage />} />
              <Route path="workflow-sidang" element={<WorkflowSidangPage />} />
 
              <Route index element={<DashboardHome />} />

              <Route path="users" element={<UsersPage />} />
              <Route path="master-data" element={<MasterDataPage />} />
              <Route path="progress" element={<MyProgressPage />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />
              <Route path="skripsi" element={<SkripsiPage />} />
              <Route path="bimbingan" element={<BimbinganPage />} />
              <Route  path="sidang/riwayat-workflow"element={<RiwayatWorkflowSidangPage />} />
              <Route path="assign-pembimbing" element={<AssignPembimbingPage />} />
              <Route path="peminjaman-ruang" element={<PeminjamanRuangPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="laporan" element={<LaporanPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;