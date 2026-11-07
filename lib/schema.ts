import { BUSINESS, siteUrl } from "./business";
import type { getCatalog } from "./catalog";

type Catalog = Awaited<ReturnType<typeof getCatalog>>;
const usd = (cents: number) => (cents / 100).toFixed(2);

/** "Structured data": a hidden description of the business that Google reads to understand who you are,
 *  where you work and what you charge. Prices come from your admin, so they always match the page. */
export function localBusinessSchema(catalog: Catalog) {
  const base = siteUrl();
  const packages = catalog.products.filter((p) => !p.isAddon);
  const daily = packages.map((p) => p.dailyCents).filter((c) => c > 0);
  const sameAs = [BUSINESS.facebookUrl, BUSINESS.googleProfileUrl].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${base}/#business`,
    name: BUSINESS.name,
    description: BUSINESS.description,
    url: `${base}/`,
    logo: `${base}/logo.png`,
    image: `${base}/logo.png`,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    // No street address: this is a delivery business. City and state only.
    address: { "@type": "PostalAddress", addressLocality: "Destin", addressRegion: "FL", addressCountry: "US" },
    areaServed: catalog.zones.map((z) => ({ "@type": "Place", name: `${z.city}, FL` })),
    priceRange: daily.length ? `$${Math.round(Math.min(...daily) / 100)}-$${Math.round(Math.max(...daily) / 100)}` : undefined,
    ...(sameAs.length ? { sameAs } : {}),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Fishing gear rental packages",
      itemListElement: packages.map((p) => ({
        "@type": "Offer",
        name: p.name,
        description: p.includes,
        priceCurrency: "USD",
        price: usd(p.dailyCents),
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: usd(p.dailyCents),
          priceCurrency: "USD",
          unitCode: "DAY",
        },
        itemOffered: { "@type": "Service", name: `${p.name} fishing gear rental`, serviceType: "Fishing gear rental" },
      })),
    },
  };
}
