import { CircleAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { riskLabels, type Risk } from "@/content/foods";

export default function RiskBadge({ risk }: { risk: Risk }) {
  const Icon = risk === "toxic" ? TriangleAlert : risk === "avoid" ? CircleAlert : ShieldCheck;
  return (
    <span className={`food-status food-status-${risk}`}>
      <Icon aria-hidden="true" />
      {riskLabels[risk]}
    </span>
  );
}
