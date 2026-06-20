const logos = [
  "Salon Andalou",
  "Boulangerie Dorée",
  "Café de la Place",
  "Hôtel Atlas",
  "Spa Zen",
  "Club Privé",
  "Maison K",
  "Le Comptoir",
  "Restaurant Médina",
  "Boutique Luce",
  "Théière Royale",
  "Pâtisserie Nord",
];

function LogoItem({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="landing-marquee-item" aria-hidden>
      <span className="landing-marquee-mark">{initials}</span>
      <span className="landing-marquee-name">{name}</span>
    </div>
  );
}

export function LandingLogoMarquee() {
  const track = [...logos, ...logos];

  return (
    <section className="landing-marquee" aria-label="Commerces qui utilisent mycarta">
      <div className="landing-marquee-fade landing-marquee-fade--left" aria-hidden />
      <div className="landing-marquee-fade landing-marquee-fade--right" aria-hidden />
      <div className="landing-marquee-track">
        {track.map((name, i) => (
          <LogoItem key={`${name}-${i}`} name={name} />
        ))}
      </div>
    </section>
  );
}
