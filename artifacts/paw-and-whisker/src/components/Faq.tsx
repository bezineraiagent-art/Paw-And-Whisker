import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { faqs } from "@/components/faqData";

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const id = useId();
  return (
    <div className="pw-faq">
      {faqs.map((f, i) => {
        const on = open === i;
        return (
          <div key={f.q} className={"pw-faq-item" + (on ? " on" : "")}>
            <h3>
              <button type="button" aria-expanded={on} aria-controls={`${id}-${i}`} id={`${id}-b${i}`} onClick={() => setOpen(on ? null : i)}>
                <span>{f.q}</span><Plus aria-hidden="true" size={22} />
              </button>
            </h3>
            <div className="pw-faq-body" id={`${id}-${i}`} role="region" aria-labelledby={`${id}-b${i}`} aria-hidden={!on}>
              <div><p>{f.a}</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
