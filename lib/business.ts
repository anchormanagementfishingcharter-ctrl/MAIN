/** Your business facts in one place. Google, Facebook and other sites should all show these exactly the same way. */
export const BUSINESS = {
  name: "Anchor Management Destin",
  phone: "+18503629295",                 // international format, used in the hidden search data
  email: "booking@anchormanagementfishing.com",
  description:
    "Fishing gear rental in Destin, FL, delivered to your condo or beach house. Rods, reels, tackle and bait for surf, kids and family trips.",
  // Paste your real links between the quotes. Empty ones are left out.
  facebookUrl: "https://www.facebook.com/profile.php?id=61591053811158",        // for example https://www.facebook.com/yourpage
  googleProfileUrl: "",   // the link to your Google Business Profile
};

/** The main web address, with no slash on the end. */
export const siteUrl = () => {
  try { return new URL(process.env.SITE_URL ?? "").origin; } catch { return "https://www.anchormanagementfishing.com"; }
};
