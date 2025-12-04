export const NAV_ITEMS = {
  unregistered: [
    { label: "Home", path: "/" },
    { label: "About Us", path: "/about" },
    { label: "Login", path: "/login" },
    { label: "Get Started", path: "/plans", highlight: true },
  ],

  creator: [
    { label: "Dashboard", path: "/dashboard/creator" },
    { label: "Analyze", path: "/analytics" },
  ],

  business: [
    { label: "Dashboard", path: "/dashboard/business" },
    { label: "Analyze", path: "/analytics/business" },
  ],

  admin: [
    { label: "Dashboard", path: "/dashboard/admin" },
    { label: "Edit Pricing", path: "/admin/edit-pricing" },
    { label: "View Enquiries", path: "/admin/enquiries" },
  ],
};
