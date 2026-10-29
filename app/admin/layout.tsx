import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin, endSession } from "@/lib/requireAdmin";
import { newBookingCount, pendingPhotoCount } from "@/lib/notify";

const tabs = [
  ["/admin/bookings", "Bookings"], ["/admin/prices", "Prices"], ["/admin/contents", "Package contents"],
  ["/admin/inventory", "Inventory"], ["/admin/tags", "Tags"], ["/admin/delivery", "Delivery"], ["/admin/bait", "Bait"],
  ["/admin/photos", "Photos"], ["/admin/videos", "Videos"], ["/admin/settings", "Alerts"],
];

async function logout() {
  "use server";
  await endSession();
  redirect("/");
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // the whole /admin area is owner-only
  const [fresh, photos] = await Promise.all([newBookingCount(), pendingPhotoCount()]);
  return (
    <div>
      <nav className="flex flex-wrap gap-2 border-b p-3">
        {tabs.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-full bg-teal-50 px-4 py-2 font-bold text-teal-900">
            {label}{(label === "Bookings" ? fresh : label === "Photos" ? photos : 0) > 0 && <span className="ml-2 rounded-full bg-yellow-300 px-2 text-sm">{label === "Bookings" ? fresh : photos}</span>}
          </Link>
        ))}
        <form action={logout} className="ml-auto"><button className="rounded-full border px-4 py-2 font-bold">Log out</button></form>
      </nav>
      {children}
    </div>
  );
}
