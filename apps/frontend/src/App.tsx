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
import JadwalSidangPage from "./pages/skripsi/JadwalSidangPage";
import PeminjamanRuangPage from "./pages/skripsi/PeminjamanRuangPage";
import NilaiSidangPage from "./pages/skripsi/NilaiSidangPage";
import RevisiFinalisasiPage from "./pages/skripsi/RevisiFinalisasiPage";
import AuditLogsPage from "./pages/audit/AuditLogsPage";
import LaporanPage from "./pages/laporan/LaporanPage";
import SeminarReviewPage from "./pages/seminar/SeminarReviewPage";
import AssignPembimbingPage from "./pages/pembimbing/AssignPembimbingPage";
import SeminarProposalPengujiPage from "./pages/sidang/SeminarProposalPengujiPage";
import SeminarProposalJadwalPage from "./pages/sidang/SeminarProposalJadwalPage";
import SeminarProposalHasilPage from "./pages/sidang/SeminarProposalHasilPage";
import SeminarProposalSuratPage from "./pages/sidang/SeminarProposalSuratPage";
import SeminarProposalAttemptPage from "./pages/sidang/SeminarProposalAttemptPage";
import SeminarHasilBerkasPage from "./pages/sidang/SeminarHasilBerkasPage";
import SeminarHasilPengujiPage from "./pages/sidang/SeminarHasilPengujiPage";
import SeminarHasilJadwalPage from "./pages/sidang/SeminarHasilJadwalPage";
import SeminarHasilHasilPage from "./pages/sidang/SeminarHasilHasilPage";
import SidangKompreBerkasPage from "./pages/sidang/SidangKompreBerkasPage";
import SidangKomprePengujiPage from "./pages/sidang/SidangKomprePengujiPage";
import SidangKompreJadwalPage from "./pages/sidang/SidangKompreJadwalPage";
import SidangKompreHasilPage from "./pages/sidang/SidangKompreHasilPage";
import SidangAkhirJadwalPage from "./pages/sidang/SidangAkhirJadwalPage";
import SidangAkhirKeputusanPage from "./pages/sidang/SidangAkhirKeputusanPage";
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
              <Route path="sidang/seminar-proposal-penguji" element={<SeminarProposalPengujiPage />} />              
              <Route path="sidang/seminar-proposal-jadwal"element={<SeminarProposalJadwalPage />} />  
              <Route path="sidang/seminar-proposal-hasil"element={<SeminarProposalHasilPage />} />  
              <Route  path="sidang/seminar-proposal-attempt"element={<SeminarProposalAttemptPage />} /> 
              <Route path="sidang/seminar-proposal-surat"element={<SeminarProposalSuratPage />} />   
              <Route path="sidang/seminar-hasil-berkas"element={<SeminarHasilBerkasPage />} />
              <Route path="sidang/seminar-hasil-penguji"element={<SeminarHasilPengujiPage />} />  
              <Route path="sidang/seminar-hasil-jadwal"element={<SeminarHasilJadwalPage />} />
              <Route  path="sidang/seminar-hasil-hasil" element={<SeminarHasilHasilPage />} />
              <Route path="seminar-review" element={<SeminarReviewPage />} />
              <Route path="sidang/kompre-berkas" element={<SidangKompreBerkasPage />} />
              <Route  path="sidang/kompre-penguji"element={<SidangKomprePengujiPage />} />
              <Route path="sidang/kompre-jadwal" element={<SidangKompreJadwalPage />} />
              <Route  path="sidang/kompre-hasil"element={<SidangKompreHasilPage />} /> 
              <Route  path="sidang/akhir-jadwal"element={<SidangAkhirJadwalPage />} />
              <Route  path="sidang/akhir-keputusan"element={<SidangAkhirKeputusanPage />} />
              <Route path="bimbingan" element={<BimbinganPage />} />
              <Route  path="sidang/riwayat-workflow"element={<RiwayatWorkflowSidangPage />} />
              <Route path="assign-pembimbing" element={<AssignPembimbingPage />} />
              <Route path="jadwal-sidang" element={<JadwalSidangPage />} />
              <Route path="nilai-sidang" element={<NilaiSidangPage />} />
              <Route path="revisi-final" element={<RevisiFinalisasiPage />} />
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