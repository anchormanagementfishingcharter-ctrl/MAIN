/** Your business facts in one place. Google, Facebook and other sites should all show these exactly the same way. */
export const BUSINESS = {
  name: "Anchor Management Destin",
  phone: "+18503629295",                 // international format, used in the hidden search data
  email: "booking@anchormanagementfishing.com",
  description:
    "Fishing gear rental in Destin, FL, delivered to your condo or beach house. Rods, reels, tackle and bait for surf, kids and family trips.",
  // Paste your real links between the quotes. Empty ones are left out.
  facebookUrl: "https://www.facebook.com/profile.php?id=61591053811158",        // for example https://www.facebook.com/yourpage
  googleProfileUrl: "https://www.google.com/search?q=Anchor+Management+Fishing+Rod+%26+Reel+Rentals&stick=H4sIAAAAAAAA_-NgU1I1qLCwsDQ0Mkw2TrNMTU1LMTa1MqgwTks2szAyMDI0tkhOSk1KW8Sq45iXnJFfpOCbmJeYnpqbmlei4JZZnJGZl64QlJ-ioKYQlJqaAyTyShJzigFRqn8TWAAAAA&hl=en&mat=CdDqgfs5my6bElcBzAmVZhchWdoSNHWZeUK8KLQJ_SPga5HncbzPq-h0fK42L4prnvvAE8hPDVWIDmbJKsJvaySgOqLCPlgYK8DlCPIbg2yCISJyK2YQSm1kiLug5uCmHhk&authuser=0&ved=1t:350944",   // the link to your Google Business Profile
};

/** The main web address, with no slash on the end. */
export const siteUrl = () => {
  try { return new URL(process.env.SITE_URL ?? "").origin; } catch { return "https://www.anchormanagementfishing.com"; }
};
