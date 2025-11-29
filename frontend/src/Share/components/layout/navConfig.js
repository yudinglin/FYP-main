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
    { label: "Customer Support", path: "/creator/enquire" },
  ],

  business: [
    { label: "Dashboard", path: "/dashboard/business" },
    { label: "Analyze", path: "/analytics" },
    { label: "Customer Support", path: "/business/enquire" },
  ],

  admin: [
    { label: "Pricing", path: "/admin/pricing" },
    { label: "View Profile", path: "/admin/profiles" },
    { label: "View Enquiries", path: "/admin/enquiries" },
  ],
};
