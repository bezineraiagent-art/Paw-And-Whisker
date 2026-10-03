import SiteHeader from "@/components/SiteHeader";
export default function Success() {
  return <div className="pw"><SiteHeader /><main id="main" className="pw-section pw-wrap"><h1>Thanks for visiting</h1><p>Whisker Plus is coming soon. This page does not verify a payment or grant paid access. All current free tools remain free.</p><p>If you paid through an earlier subscription link, contact <a href="mailto:paul@pawandwhisker.net">Paul</a> for billing support.</p><a className="pw-btn" href="/#free-chat">Use the free chat</a></main></div>;
}