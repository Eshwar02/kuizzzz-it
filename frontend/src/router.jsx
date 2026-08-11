import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
import RoleRoute from "./auth/RoleRoute";
import AppLayout from "./components/layout/AppLayout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import NotFound from "./pages/NotFound";

import Browse from "./pages/student/Browse";
import QuizDetail from "./pages/student/QuizDetail";
import Attempt from "./pages/student/Attempt";
import Result from "./pages/student/Result";
import MyAttempts from "./pages/student/MyAttempts";
import StudentDashboard from "./pages/student/Dashboard";
import Leaderboard from "./pages/student/Leaderboard";

import FacultyDashboard from "./pages/faculty/Dashboard";
import MyQuizzes from "./pages/faculty/MyQuizzes";
import QuizForm from "./pages/faculty/QuizForm";
import QuestionManager from "./pages/faculty/QuestionManager";
import QuizResults from "./pages/faculty/QuizResults";
import AIGenerate from "./pages/faculty/AIGenerate";

import AdminDashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";
import Categories from "./pages/admin/Categories";
import Analytics from "./pages/admin/Analytics";
import AllAttempts from "./pages/admin/AllAttempts";
import AdminClassrooms from "./pages/admin/Classrooms";

import FacultyClasses from "./pages/faculty/MyClasses";
import StudentClasses from "./pages/student/MyClasses";
import ClassroomDetail from "./pages/classroom/ClassroomDetail";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          // Shared (any authenticated role; backend enforces class membership)
          { path: "/classes/:id", element: <ClassroomDetail /> },
          // Student
          { element: <RoleRoute roles={["STUDENT"]} />, children: [
            { path: "/", element: <Browse /> },
            { path: "/quizzes/:id", element: <QuizDetail /> },
            { path: "/attempt/:quizId", element: <Attempt /> },
            { path: "/results/:attemptId", element: <Result /> },
            { path: "/my-attempts", element: <MyAttempts /> },
            { path: "/classes", element: <StudentClasses /> },
            { path: "/dashboard", element: <StudentDashboard /> },
            { path: "/leaderboard", element: <Leaderboard /> },
          ]},
          // Faculty (authoring belongs to faculty; admins manage users/categories/analytics)
          { element: <RoleRoute roles={["FACULTY"]} />, children: [
            { path: "/faculty", element: <FacultyDashboard /> },
            { path: "/faculty/quizzes", element: <MyQuizzes /> },
            { path: "/faculty/quizzes/new", element: <QuizForm /> },
            { path: "/faculty/quizzes/:id/edit", element: <QuizForm /> },
            { path: "/faculty/quizzes/:id/questions", element: <QuestionManager /> },
            { path: "/faculty/quizzes/:id/results", element: <QuizResults /> },
            { path: "/faculty/classes", element: <FacultyClasses /> },
            { path: "/faculty/ai", element: <AIGenerate /> },
          ]},
          // Admin
          { element: <RoleRoute roles={["ADMIN"]} />, children: [
            { path: "/admin", element: <AdminDashboard /> },
            { path: "/admin/users", element: <Users /> },
            { path: "/admin/categories", element: <Categories /> },
            { path: "/admin/classes", element: <AdminClassrooms /> },
            { path: "/admin/analytics", element: <Analytics /> },
            { path: "/admin/attempts", element: <AllAttempts /> },
          ]},
        ],
      },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
