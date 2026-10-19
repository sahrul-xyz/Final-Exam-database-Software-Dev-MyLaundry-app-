import { PartnerDashboard } from "../features/partner/PartnerDashboard";
import { UserProfile } from "../services/supabase";

export function PartnerDashboardPage({
  currentUser,
}: {
  currentUser?: UserProfile | null;
}) {
  return <PartnerDashboard currentUser={currentUser} />;
}
