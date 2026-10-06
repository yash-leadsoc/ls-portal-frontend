import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { LoadingPage } from './components/ui';
import Layout from './components/Layout';
import { lazy, Suspense, useEffect } from 'react';

import Login from './pages/Login';
const CohortDashboard = lazy(() => import('./pages/shared/CohortDashboard'));
const OverviewDashboard = lazy(() => import('./pages/shared/OverviewDashboard'));
const PeoplePage = lazy(() => import('./pages/shared/PeoplePage'));
const MaterialsPage = lazy(() => import('./pages/shared/MaterialsPage'));
const DocumentDetail = lazy(() => import('./pages/shared/DocumentDetail'));
const EmployeeDetail = lazy(() => import('./pages/shared/EmployeeDetail'));
const ChecklistView = lazy(() => import('./pages/shared/ChecklistView'));
const DomainsPage = lazy(() => import('./pages/admin/DomainsPage'));
const CategoriesPage = lazy(() => import('./pages/admin/CategoriesPage'));
const AccountPage = lazy(() => import('./pages/account/AccountPage'));
const HelpVideo = lazy(() => import('./pages/employee/HelpVideo'));
const MyProfile = lazy(() => import('./pages/employee/MyProfile'));
const Community = lazy(() => import('./pages/shared/Community'));
const EmployeeDomains = lazy(() => import('./pages/employee/EmployeeDomains'));
const DomainDetail = lazy(() => import('./pages/employee/DomainDetail'));
const DoChecklist = lazy(() => import('./pages/employee/DoChecklist'));
const DoWriteup = lazy(() => import('./pages/employee/DoWriteup'));
const MyProgress = lazy(() => import('./pages/employee/MyProgress'));
const LogsPage = lazy(() => import('./pages/shared/LogsPage'));
const InsightsPage = lazy(() => import('./pages/shared/InsightsPage'));
const InterviewsPage = lazy(() => import('./pages/shared/InterviewsPage'));
const RecycleBin = lazy(() => import('./pages/shared/RecycleBin'));
const BenchTracker = lazy(() => import('./pages/admin/BenchTracker'));
const SendMail = lazy(() => import('./pages/admin/SendMail'));
function AdminRoutes() {
  const { user } = useAuth();
  const fullAdmin = !user.subAdmin;
  return (
    <Routes>
      <Route path="/" element={<OverviewDashboard />} />
      <Route path="/training-overview" element={<CohortDashboard />} />
      <Route path="/people" element={<PeoplePage />} />
      <Route path="/materials" element={<MaterialsPage />} />
      <Route path="/domains" element={<DomainsPage />} />
      <Route path="/categories" element={<CategoriesPage />} />
      <Route path="/document/:id" element={<DocumentDetail />} />
      <Route path="/employee/:id" element={<EmployeeDetail />} />
      <Route path="/employee/:id/domain/:domainId/checklist" element={<ChecklistView />} />
      <Route path="/community" element={<Community />} />
      {fullAdmin && <Route path="/insights" element={<InsightsPage />} />}
      {fullAdmin && <Route path="/logs" element={<LogsPage />} />}
      {fullAdmin && <Route path="/mail" element={<SendMail />} />}
      <Route path="/interviews" element={<InterviewsPage />} />
       <Route path="/bench" element={<BenchTracker />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/recycle-bin" element={<RecycleBin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function BuRoutes() {
  return (
    <Routes>
      <Route path="/" element={<OverviewDashboard />} />
      <Route path="/training-overview" element={<CohortDashboard />} />
      <Route path="/people" element={<PeoplePage />} />
      <Route path="/materials" element={<MaterialsPage />} />
      <Route path="/domains" element={<DomainsPage />} />
      <Route path="/document/:id" element={<DocumentDetail />} />
      <Route path="/employee/:id" element={<EmployeeDetail />} />
      <Route path="/employee/:id/domain/:domainId/checklist" element={<ChecklistView />} />
      <Route path="/community" element={<Community />} />
      <Route path="/logs" element={<LogsPage />} />
      <Route path="/interviews" element={<InterviewsPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function CtoRoutes() {
  return (
    <Routes>
      <Route path="/" element={<OverviewDashboard />} />
      <Route path="/training-overview" element={<CohortDashboard />} />
      <Route path="/people" element={<PeoplePage />} />
      <Route path="/materials" element={<MaterialsPage />} />
      <Route path="/domains" element={<DomainsPage />} />
      <Route path="/document/:id" element={<DocumentDetail />} />
      <Route path="/employee/:id" element={<EmployeeDetail />} />
      <Route path="/employee/:id/domain/:domainId/checklist" element={<ChecklistView />} />
      <Route path="/community" element={<Community />} />
      <Route path="/insights" element={<InsightsPage />} />
      <Route path="/logs" element={<LogsPage />} />
      <Route path="/interviews" element={<InterviewsPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ManagerRoutes() {
  return (
    <Routes>
      <Route path="/" element={<OverviewDashboard />} />
      <Route path="/training-overview" element={<CohortDashboard />} />
      <Route path="/people" element={<PeoplePage />} />
      <Route path="/materials" element={<MaterialsPage />} />
      <Route path="/document/:id" element={<DocumentDetail />} />
      <Route path="/employee/:id" element={<EmployeeDetail />} />
      <Route path="/employee/:id/domain/:domainId/checklist" element={<ChecklistView />} />
      <Route path="/community" element={<Community />} />
      <Route path="/logs" element={<LogsPage />} />
      <Route path="/interviews" element={<InterviewsPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function EmployeeRoutes() {
  return (
    <Routes>
      <Route path="/" element={<EmployeeDomains />} />
      <Route path="/domain/:id" element={<DomainDetail />} />
      <Route path="/checklist/:id" element={<DoChecklist />} />
      <Route path="/writeup/:id" element={<DoWriteup />} />
      <Route path="/progress" element={<MyProgress />} />
      <Route path="/help" element={<HelpVideo />} />
      <Route path="/profile" element={<MyProfile />} />
      <Route path="/community" element={<Community />} />
      <Route path="/interviews" element={<InterviewsPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    const blockContext = (e) => e.preventDefault();
    const blockKeys = (e) => {
      const k = (e.key || '').toUpperCase();
      if (k === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(k)) ||
        (e.ctrlKey && k === 'U')) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', blockContext);
    document.addEventListener('keydown', blockKeys);
    return () => {
      document.removeEventListener('contextmenu', blockContext);
      document.removeEventListener('keydown', blockKeys);
    };
  }, []);

  if (loading) return <LoadingPage />;
  if (!user) return <Login />;

  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<LoadingPage />}>
          {user.role === 'admin' && <AdminRoutes />}
          {user.role === 'cto' && <CtoRoutes />}
          {user.role === 'bu' && <BuRoutes />}
          {user.role === 'manager' && <ManagerRoutes />}
          {user.role === 'employee' && <EmployeeRoutes />}
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}
