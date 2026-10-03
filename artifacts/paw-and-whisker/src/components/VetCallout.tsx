import { MapPin } from "lucide-react";
export default function VetCallout({ className = "", text = "Need a clinic now? Find nearby vets and emergency clinics." }: { className?: string; text?: string }) {
  return <a className={`pw-vetlink ${className}`} href="/find-a-vet" data-testid="link-find-a-vet"><MapPin size={18} aria-hidden="true" /><span>{text}</span></a>;
}
