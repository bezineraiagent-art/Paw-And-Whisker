import { AlertOctagon, AlertTriangle, Eye, Phone } from "lucide-react";
import { urgencyLevels, type Urgency } from "@/content/urgency";

const icons = { monitor: Eye, today: Phone, urgent: AlertTriangle, emergency: AlertOctagon } as const;

/** Text label first; colour and icon are only reinforcement. */
export default function UrgencyBadge({ level, className = "" }: { level: Urgency; className?: string }) {
  const Icon = icons[level];
  return <p className={`pw-urgency u-${level} ${className}`} data-testid={`badge-urgency-${level}`}><Icon size={18} aria-hidden="true" /><span>{urgencyLevels[level].label}</span></p>;
}
