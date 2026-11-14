import { redirect } from "next/navigation";

// Design collections are managed from T-Shirt Depot's Barter Network profile.
const BARTER_SITE = (process.env.NEXT_PUBLIC_BARTER_NETWORK_URL || "https://barternetworkokc.com").replace(/\/$/, "");

export default function AdminCollectionsRedirect() {
  redirect(`${BARTER_SITE}/design-collections`);
}
