// import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// import { useAuth } from './auth/AuthContext';
// import { LoadingPage } from './components/ui';
// import Layout from './components/Layout';
// import { lazy, Suspense, useEffect } from 'react';

// import Login from './pages/Login';
// const CohortDashboard = lazy(() => import('./pages/shared/CohortDashboard'));
// const OverviewDashboard = lazy(() => import('./pages/shared/OverviewDashboard'));
// const PeoplePage = lazy(() => import('./pages/shared/PeoplePage'));
// const MaterialsPage = lazy(() => import('./pages/shared/MaterialsPage'));
// const DocumentDetail = lazy(() => import('./pages/shared/DocumentDetail'));
// const EmployeeDetail = lazy(() => import('./pages/shared/EmployeeDetail'));
// const ChecklistView = lazy(() => import('./pages/shared/ChecklistView'));
// const DomainsPage = lazy(() => import('./pages/admin/DomainsPage'));
// const CategoriesPage = lazy(() => import('./pages/admin/CategoriesPage'));
// const AccountPage = lazy(() => import('./pages/account/AccountPage'));
// const HelpVideo = lazy(() => import('./pages/employee/HelpVideo'));
// const MyProfile = lazy(() => import('./pages/employee/MyProfile'));
// const Community = lazy(() => import('./pages/shared/Community'));
// const EmployeeDomains = lazy(() => import('./pages/employee/EmployeeDomains'));
// const DomainDetail = lazy(() => import('./pages/employee/DomainDetail'));
// const DoChecklist = lazy(() => import('./pages/employee/DoChecklist'));
// const DoWriteup = lazy(() => import('./pages/employee/DoWriteup'));
// const MyProgress = lazy(() => import('./pages/employee/MyProgress'));
// const LogsPage = lazy(() => import('./pages/shared/LogsPage'));
// const InsightsPage = lazy(() => import('./pages/shared/InsightsPage'));
// const InterviewsPage = lazy(() => import('./pages/shared/InterviewsPage'));
// const RecycleBin = lazy(() => import('./pages/shared/RecycleBin'));
// const BenchTracker = lazy(() => import('./pages/admin/BenchTracker'));
// const SendMail = lazy(() => import('./pages/admin/SendMail'));
// const MailAutomation = lazy(() => import('./pages/admin/MailAutomation'));

// import ExamLanding from './pages/exam/ExamLanding';
// import ExamRegistration from './pages/exam/ExamRegistration';
// import ExamInstructions from './pages/exam/ExamInstructions';
// import ExamInterface from './pages/exam/ExamInterface';
// import ExamSubmitted from './pages/exam/ExamSubmitted';

// const ExamAdminDashboard = lazy(
//   () => import('./pages/exam/ExamAdminDashboard')
// );

// const ExamManagement = lazy(
//   () => import('./pages/exam/ExamManagement')
// );

// const ExamEditor = lazy(
//   () => import('./pages/exam/ExamEditor')
// );

// const ExamSetManagement = lazy(
//   () => import('./pages/exam/ExamSetManagement')
// );

// const QuestionManagement = lazy(
//   () => import('./pages/exam/QuestionManagement')
// );

// const CandidateManagement = lazy(
//   () => import('./pages/exam/CandidateManagement')
// );

// const ExamResults = lazy(
//   () => import('./pages/exam/ExamResults')
// );

// const CandidateReport = lazy(
//   () => import('./pages/exam/CandidateReport')
// );

// const ExamEvaluation = lazy(
//   () => import('./pages/exam/ExamEvaluation')
// );


// function AdminRoutes() {
//   const { user } = useAuth();
//   const fullAdmin = !user.subAdmin;
//   return (
//     <Routes>
//       <Route path="/" element={<OverviewDashboard />} />
//       <Route path="/training-overview" element={<CohortDashboard />} />
//       <Route path="/people" element={<PeoplePage />} />
//       <Route path="/materials" element={<MaterialsPage />} />
//       <Route path="/domains" element={<DomainsPage />} />
//       <Route path="/categories" element={<CategoriesPage />} />
//       <Route path="/document/:id" element={<DocumentDetail />} />
//       <Route path="/employee/:id" element={<EmployeeDetail />} />
//       <Route path="/employee/:id/domain/:domainId/checklist" element={<ChecklistView />} />
//       <Route path="/community" element={<Community />} />
//       {fullAdmin && <Route path="/insights" element={<InsightsPage />} />}
//       {fullAdmin && <Route path="/logs" element={<LogsPage />} />}
//       <Route path="/mail" element={<SendMail />} />
//       {fullAdmin && <Route path="/automation" element={<MailAutomation />} />}
//       <Route path="/interviews" element={<InterviewsPage />} />
//       <Route path="/bench" element={<BenchTracker />} />
//       <Route path="/account" element={<AccountPage />} />
//       <Route path="/recycle-bin" element={<RecycleBin />} />
//       <Route path="*" element={<Navigate to="/" replace />} />
//     </Routes>
//   );
// }

// function BuRoutes() {
//   return (
//     <Routes>
//       <Route path="/" element={<OverviewDashboard />} />
//       <Route path="/training-overview" element={<CohortDashboard />} />
//       <Route path="/people" element={<PeoplePage />} />
//       <Route path="/materials" element={<MaterialsPage />} />
//       <Route path="/domains" element={<DomainsPage />} />
//       <Route path="/document/:id" element={<DocumentDetail />} />
//       <Route path="/employee/:id" element={<EmployeeDetail />} />
//       <Route path="/employee/:id/domain/:domainId/checklist" element={<ChecklistView />} />
//       <Route path="/community" element={<Community />} />
//       <Route path="/logs" element={<LogsPage />} />
//       <Route path="/interviews" element={<InterviewsPage />} />
//       <Route path="/account" element={<AccountPage />} />
//       <Route path="*" element={<Navigate to="/" replace />} />
//     </Routes>
//   );
// }

// function CtoRoutes() {
//   return (
//     <Routes>
//       <Route path="/" element={<OverviewDashboard />} />
//       <Route path="/training-overview" element={<CohortDashboard />} />
//       <Route path="/people" element={<PeoplePage />} />
//       <Route path="/materials" element={<MaterialsPage />} />
//       <Route path="/domains" element={<DomainsPage />} />
//       <Route path="/document/:id" element={<DocumentDetail />} />
//       <Route path="/employee/:id" element={<EmployeeDetail />} />
//       <Route path="/employee/:id/domain/:domainId/checklist" element={<ChecklistView />} />
//       <Route path="/community" element={<Community />} />
//       <Route path="/insights" element={<InsightsPage />} />
//       <Route path="/logs" element={<LogsPage />} />
//       <Route path="/interviews" element={<InterviewsPage />} />
//       <Route path="/account" element={<AccountPage />} />
//       <Route path="*" element={<Navigate to="/" replace />} />
//     </Routes>
//   );
// }

// function ManagerRoutes() {
//   return (
//     <Routes>
//       <Route path="/" element={<OverviewDashboard />} />
//       <Route path="/training-overview" element={<CohortDashboard />} />
//       <Route path="/people" element={<PeoplePage />} />
//       <Route path="/materials" element={<MaterialsPage />} />
//       <Route path="/document/:id" element={<DocumentDetail />} />
//       <Route path="/employee/:id" element={<EmployeeDetail />} />
//       <Route path="/employee/:id/domain/:domainId/checklist" element={<ChecklistView />} />
//       <Route path="/community" element={<Community />} />
//       <Route path="/logs" element={<LogsPage />} />
//       <Route path="/interviews" element={<InterviewsPage />} />
//       <Route path="/account" element={<AccountPage />} />
//       <Route path="*" element={<Navigate to="/" replace />} />
//     </Routes>
//   );
// }

// function EmployeeRoutes() {
//   return (
//     <Routes>
//       <Route path="/" element={<EmployeeDomains />} />
//       <Route path="/domain/:id" element={<DomainDetail />} />
//       <Route path="/checklist/:id" element={<DoChecklist />} />
//       <Route path="/writeup/:id" element={<DoWriteup />} />
//       <Route path="/progress" element={<MyProgress />} />
//       <Route path="/help" element={<HelpVideo />} />
//       <Route path="/profile" element={<MyProfile />} />
//       <Route path="/community" element={<Community />} />
//       <Route path="/interviews" element={<InterviewsPage />} />
//       <Route path="/account" element={<AccountPage />} />
//       <Route path="*" element={<Navigate to="/" replace />} />
//     </Routes>
//   );
// }


// function StudentExamRoutes() {
//   return (
//     <Routes>
//       <Route index element={<ExamLanding />} />
//       <Route path="register/:examId" element={<ExamRegistration />} />
//       <Route path="instructions/:attemptId" element={<ExamInstructions />} />
//       <Route path="attempt/:attemptId" element={<ExamInterface />} />
//       <Route path="submitted/:attemptId" element={<ExamSubmitted />} />
//       <Route path="*" element={<Navigate to="/exam" replace />} />
//     </Routes>
//   );
// }

// function ExamAdminGuard() {
//   const { user, loading } = useAuth();

//   if (loading) return <LoadingPage />;

//   if (!user) return <Login />;

//   if (user.role !== 'admin' || user.subAdmin) {
//     return <Navigate to="/" replace />;
//   }

//   return (
//     <Layout>
//       <Routes>
//         <Route index element={<ExamAdminDashboard />} />
//         <Route path="exams" element={<ExamManagement />} />
//         <Route path="exams/:examId" element={<ExamEditor />} />
//         <Route
//           path="exams/:examId/sets"
//           element={<ExamSetManagement />}
//         />
//         <Route
//           path="exams/:examId/sets/:setId/questions"
//           element={<QuestionManagement />}
//         />
//         <Route path="candidates" element={<CandidateManagement />} />
//         <Route path="results" element={<ExamResults />} />
//         <Route path="results/:attemptId" element={<CandidateReport />} />
//         <Route path="evaluation" element={<ExamEvaluation />} />
//         <Route path="*" element={<Navigate to="/exam/admin" replace />} />
//       </Routes>
//     </Layout>
//   );
// }



// export default function App() {
//   const { user, loading } = useAuth();

//   useEffect(() => {
//     const blockContext = (e) => e.preventDefault();
//     const blockKeys = (e) => {
//       const k = (e.key || '').toUpperCase();
//       if (k === 'F12' ||
//         (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(k)) ||
//         (e.ctrlKey && k === 'U')) {
//         e.preventDefault();
//       }
//     };
//     document.addEventListener('contextmenu', blockContext);
//     document.addEventListener('keydown', blockKeys);
//     return () => {
//       document.removeEventListener('contextmenu', blockContext);
//       document.removeEventListener('keydown', blockKeys);
//     };
//   }, []);

//   if (loading) return <LoadingPage />;
//   if (!user) return <Login />;

//   return (
//     <BrowserRouter>

//       <Route path="/exam" element={<ExamLanding />} />
//       <Route path="/exam/register/:examId" element={<ExamRegistration />} />
//       <Route path="/exam/instructions/:attemptId" element={<ExamInstructions />} />
//       <Route path="/exam/attempt/:attemptId" element={<ExamInterface />} />
//       <Route path="/exam/submitted/:attemptId" element={<ExamSubmitted />} />
//       <Route path="/exam/admin" element={<ExamAdminDashboard />} />
//       <Route path="/exam/admin/exams" element={<ExamManagement />} />
//       <Route path="/exam/admin/exams/:examId" element={<ExamEditor />} />
//       <Route path="/exam/admin/exams/:examId/sets" element={<ExamSetManagement />} />
//       <Route path="/exam/admin/exams/:examId/sets/:setId/questions" element={<QuestionManagement />} />
//       <Route path="/exam/admin/candidates" element={<CandidateManagement />} />
//       <Route path="/exam/admin/results" element={<ExamResults />} />
//       <Route path="/exam/admin/results/:attemptId" element={<CandidateReport />} />
//       <Route path="/exam/admin/evaluation" element={<ExamEvaluation />} />
//       <Layout>
//         <Suspense fallback={<LoadingPage />}>
//           {user.role === 'admin' && <AdminRoutes />}
//           {user.role === 'cto' && <CtoRoutes />}
//           {user.role === 'bu' && <BuRoutes />}
//           {user.role === 'manager' && <ManagerRoutes />}
//           {user.role === 'employee' && <EmployeeRoutes />}
//         </Suspense>

//         {/* <Routes>

//         <Route
//           path="/exam/admin/*"
//           element={<ExamAdminGuard />}
//         />

//          <Route
//           path="/exam/*"
//           element={
//             <Suspense fallback={<LoadingPage />}>
//               <StudentExamRoutes />
//             </Suspense>
//           }
//         />

//          <Route
//           path="/*"
//           element={
//             loading ? (
//               <LoadingPage />
//             ) : !user ? (
//               <Login />
//             ) : (
//               <AuthenticatedPortal user={user} />
//             )
//           }
//         />
// </Routes> */}
//       </Layout>
//     </BrowserRouter>
//   );
// }


import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { LoadingPage } from './components/ui';
import Layout from './components/Layout';
import { lazy, Suspense, useEffect } from 'react';

import Login from './pages/Login';

// Existing portal pages
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
const MailAutomation = lazy(() => import('./pages/admin/MailAutomation'));


// Student exam pages
import ExamLanding from './pages/exam/ExamLanding';
import ExamRegistration from './pages/exam/ExamRegistration';
import ExamInstructions from './pages/exam/ExamInstructions';
import ExamInterface from './pages/exam/ExamInterface';
import ExamSubmitted from './pages/exam/ExamSubmitted';

// Exam admin pages
const ExamAdminLayout = lazy(
  () => import('./pages/exam/ExamAdminLayout')
);
const ExamAdminDashboard = lazy(() => import('./pages/exam/ExamAdminDashboard'));
const ExamManagement = lazy(() => import('./pages/exam/ExamManagement'));
const ExamEditor = lazy(() => import('./pages/exam/ExamEditor'));
const ExamSetManagement = lazy(() => import('./pages/exam/ExamSetManagement'));
const QuestionManagement = lazy(() => import('./pages/exam/QuestionManagement'));
const CandidateManagement = lazy(() => import('./pages/exam/CandidateManagement'));
const ExamResults = lazy(() => import('./pages/exam/ExamResults'));
const CandidateReport = lazy(() => import('./pages/exam/CandidateReport'));
const ExamEvaluation = lazy(() => import('./pages/exam/ExamEvaluation'));



function AdminRoutes() {
  const { user } = useAuth();
  const fullAdmin = !user?.subAdmin;

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
      <Route
        path="/employee/:id/domain/:domainId/checklist"
        element={<ChecklistView />}
      />
      <Route path="/community" element={<Community />} />
      {fullAdmin && <Route path="/insights" element={<InsightsPage />} />}
      {fullAdmin && <Route path="/logs" element={<LogsPage />} />}
      <Route path="/mail" element={<SendMail />} />
      {fullAdmin && <Route path="/automation" element={<MailAutomation />} />}
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
      <Route
        path="/employee/:id/domain/:domainId/checklist"
        element={<ChecklistView />}
      />
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
      <Route
        path="/employee/:id/domain/:domainId/checklist"
        element={<ChecklistView />}
      />
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
      <Route
        path="/employee/:id/domain/:domainId/checklist"
        element={<ChecklistView />}
      />
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

// Public student exam routes
function StudentExamRoutes() {
  return (
    <Routes>
      <Route index element={<ExamLanding />} />
      <Route path="register/:examId" element={<ExamRegistration />} />
      <Route path="instructions/:attemptId" element={<ExamInstructions />} />
      <Route path="attempt/:attemptId" element={<ExamInterface />} />
      <Route path="submitted/:attemptId" element={<ExamSubmitted />} />
      <Route path="*" element={<Navigate to="/exam" replace />} />
    </Routes>
  );
}

// Protected exam administration routes
function ExamAdminGuard() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingPage />;
  if (!user) return <Login />;

  if (user.role !== 'admin' || user.subAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
  <Suspense fallback={<LoadingPage />}>
    <ExamAdminLayout>
      <Routes>
        <Route index element={<ExamAdminDashboard />} />
        <Route path="exams" element={<ExamManagement />} />
        <Route path="exams/:examId" element={<ExamEditor />} />
        <Route
          path="exams/:examId/sets"
          element={<ExamSetManagement />}
        />
        <Route
          path="exams/:examId/sets/:setId/questions"
          element={<QuestionManagement />}
        />
        <Route path="candidates" element={<CandidateManagement />} />
        <Route path="results" element={<ExamResults />} />
        <Route path="results/:attemptId" element={<CandidateReport />} />
        <Route path="evaluation" element={<ExamEvaluation />} />
        <Route
          path="*"
          element={<Navigate to="/exam/admin" replace />}
        />
      </Routes>
    </ExamAdminLayout>
  </Suspense>
);
}

// Existing authenticated portal routes
function AuthenticatedPortal({ user }) {
  if (!user) return <Login />;

  return (
    <Layout>
      <Suspense fallback={<LoadingPage />}>
        {user.role === 'admin' && <AdminRoutes />}
        {user.role === 'cto' && <CtoRoutes />}
        {user.role === 'bu' && <BuRoutes />}
        {user.role === 'manager' && <ManagerRoutes />}
        {user.role === 'employee' && <EmployeeRoutes />}
      </Suspense>
    </Layout>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    const blockContext = (event) => event.preventDefault();

    const blockKeys = (event) => {
      const key = (event.key || '').toUpperCase();

      if (
        key === 'F12' ||
        (event.ctrlKey &&
          event.shiftKey &&
          ['I', 'J', 'C'].includes(key)) ||
        (event.ctrlKey && key === 'U')
      ) {
        event.preventDefault();
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

  return (
    <BrowserRouter>
      <Routes>
        {/* Admin exam portal - protected inside its guard */}
        <Route path="/exam/admin/*" element={<ExamAdminGuard />} />

        {/* Public student exam portal */}
        <Route
          path="/exam/*"
          element={
            <Suspense fallback={<LoadingPage />}>
              <StudentExamRoutes />
            </Suspense>
          }
        />

        {/* Existing LeadSoc authenticated portal */}
        <Route
          path="/*"
          element={<AuthenticatedPortal user={user} />}
        />
      </Routes>
    </BrowserRouter>
  );
}
