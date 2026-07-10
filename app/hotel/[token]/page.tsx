import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/tsb/store";
import { ATTR_COOKIE, verifyAttribution } from "@/lib/tsb/auth";
import HotelExperience from "./HotelExperience";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function HotelPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const store = getStore();
  const property = store.hotelProperties.find((p) => p.qrToken === token);

  if (!property) notFound();

  const cookieStore = await cookies();
  const attrCookie = cookieStore.get(ATTR_COOKIE)?.value;
  const attribution = attrCookie ? await verifyAttribution(attrCookie) : null;

  const tours = store.tours.filter(
    (t) => t.cityId === property.cityId && t.status === "published"
  );
  const categories = store.categories.filter(
    (c) => c.cityId === property.cityId && c.isActive
  );

  return (
    <HotelExperience
      property={property}
      tours={tours}
      categories={categories}
      qrToken={token}
      attributed={!!attribution && attribution.hotelId === property.id}
    />
  );
}
