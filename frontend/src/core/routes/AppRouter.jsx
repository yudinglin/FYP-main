import { Routes, Route } from "react-router-dom";

import MainLayout from "../../Share/layouts/MainLayout.jsx";
import AuthLayout from "../../Share/layouts/AuthLayout.jsx";

import Landing from "../../pages/misc/Landing.jsx";
import NotFound from "../../pages/misc/NotFound.jsx";
import AboutUs from "../../pages/misc/AboutUs.jsx";
import ContactSupport from "../../pages/misc/ContactSupport";

import Login from "../../pages/auth/Login.jsx";
import Register from "../../pages/auth/Register.jsx";
import PlansPage from "../../pages/UnregisteredUser/PlansPage.jsx";

import CreatorDashboard from "../../pages/dashboard/CreatorDashboard.jsx";
import BusinessDashboard from "../../pages/dashboard/BusinessDashboard.jsx";
import AdminDashboard from "../../pages/dashboard/AdminDashboard.jsx";

import AnalyticsOverview from "../../pages/analytics/AnalyticsOverview.jsx";
import BusinessAnalyticsOverview from "../../pages/analytics/BusinessAnalyticsOverview.jsx";
import Profile from "../../pages/profile/Profile.jsx";

import NetworkGraph from "../../pages/Creator/NetworkGraph.jsx";
import CentralityMetrics from "../../pages/Creator/CentralityMetrics.jsx";
import PredictiveAnalysis from "../../pages/Creator/PredictiveAnalysis.jsx";

export default function AppRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <MainLayout>
            <Landing />
          </MainLayout>
        }
      />

    {/* Plans Page */}
      <Route
        path="/plans"
        element={
          <MainLayout>
            <PlansPage />
          </MainLayout>
        }
      />

    {/* AboutUs Page */}
      <Route
      path="/about"
      element={
        <MainLayout>
          <AboutUs />
        </MainLayout>
      }
    />
    {/* ContactSupport Page */}
      <Route
      path="/contact-support"
      element={
        <MainLayout>
          <ContactSupport />
        </MainLayout>
      }
    />
      <Route
        path="/login"
        element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        }
      />
      <Route
        path="/register"
        element={
          <AuthLayout>
            <Register />
          </AuthLayout>
        }
      />

      <Route
        path="/dashboard"
        element={
          <MainLayout>
            <CreatorDashboard />
          </MainLayout>
        }
      />
      <Route
        path="/dashboard/network"
        element={
          <MainLayout>
            <NetworkGraph />
          </MainLayout>
        }
      />
      <Route
        path="/dashboard/centrality"
        element={
          <MainLayout>
            <CentralityMetrics />
          </MainLayout>
        }
      />
      <Route
        path="/dashboard/predictive"
        element={
          <MainLayout>
            <PredictiveAnalysis />
          </MainLayout>
        }
      />
      <Route
        path="/dashboard/business"
        element={
          <MainLayout>
            <BusinessDashboard />
          </MainLayout>
        }
      />
      <Route
        path="/dashboard/admin"
        element={
          <MainLayout>
            <AdminDashboard />
          </MainLayout>
        }
      />

      <Route
        path="/analytics"
        element={
          <MainLayout>
            <AnalyticsOverview />
          </MainLayout>
        }
      />

      <Route
        path="/analytics/business"
        element={
          <MainLayout>
            <BusinessAnalyticsOverview />
          </MainLayout>
        }
      />

      <Route
        path="/profile"
        element={
          <MainLayout>
            <Profile />
          </MainLayout>
        }
      />

      <Route
        path="*"
        element={
          <MainLayout>
            <NotFound />
          </MainLayout>
        }
      />
    </Routes>
  );
}
