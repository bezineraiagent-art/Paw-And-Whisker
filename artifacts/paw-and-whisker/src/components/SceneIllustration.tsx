const scenes = {
  home: { src: "/scenes/home-scene.svg", alt: "Illustration of a sleek black cat and a larger brown tabby side by side on a sofa, looking at a glowing phone, with a night window turning to dawn.", caption: "Illustration: Lucky-and-Sugar style evening on the sofa." },
  guides: { src: "/scenes/guides-scene.svg", alt: "Illustration of a golden puppy beside a doorframe with pencil growth marks, a food bowl and a blanket.", caption: "Illustration: a golden puppy by the doorframe where growth is marked." },
  food: { src: "/scenes/food-scene.svg", alt: "Illustration of a kitchen counter with blueberries, carrot sticks, apple slices and plain cooked chicken, a green check badge, and a puppy nose peeking up from below.", caption: "Illustration: plain, simple preparations only. Even foods that are generally non-toxic are not guaranteed safe for every pet." },
  vet: { src: "/scenes/vet-scene.svg", alt: "Illustration of a person holding a black cat in a calm clinic waiting room, a map pin above, and a small clinic with a heart sign seen through the window.", caption: "Illustration: a calm wait at the clinic." },
} as const;

export default function SceneIllustration({ scene, caption }: { scene: keyof typeof scenes; caption?: string }) {
  const s = scenes[scene];
  return (
    <figure className="pw-scene" data-testid={`figure-scene-${scene}`}>
      <img src={s.src} alt={s.alt} width={1200} height={630} loading="lazy" decoding="async" />
      <figcaption>{caption ?? s.caption}</figcaption>
    </figure>
  );
}
