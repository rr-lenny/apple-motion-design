// Paramètres du short. Tout ce qui est entre crochets dans le brief se règle ici.
// Les temps sont en secondes ; à 120 BPM un temps = 0,5 s, donc chaque phrase
// démarre sur un temps de la musique.
// Dans `text`, les mots entourés d'astérisques sont les mots clés (couleur d'accent + bold).
window.SHORT_CONFIG = {
  width: 1080,
  height: 1920,
  fps: 60,
  duration: 24,
  bpm: 120,

  colors: {
    bg: "#F5F5F7",
    ink: "#1D1D1F",
    accent: "#0071E3",
  },

  brand: "Folio",
  cta: "Lien en bio",

  // Script : hook → problème → démo → CTA
  phrases: [
    // 1. Hook
    { start: 0.0, end: 1.0, text: "Vos projets" },
    { start: 1.0, end: 2.5, text: "méritent *mieux.*" },
    // 2. Problème
    { start: 2.5, end: 4.0, text: "Des liens *partout.*" },
    { start: 4.0, end: 5.5, text: "Des PDF *trop lourds.*" },
    { start: 5.5, end: 7.0, text: "Des clients *perdus.*" },
    // 3. Démo
    { start: 7.0, end: 8.5, text: "Et si tout tenait" },
    { start: 8.5, end: 10.5, text: "dans un *seul dossier* ?" },
    { start: 10.5, end: 12.5, text: "*Pages web,* photos," },
    { start: 12.5, end: 14.5, text: "*tarifs,* études de cas." },
    { start: 14.5, end: 16.5, text: "Partagez-les en *un clic.*" },
    { start: 16.5, end: 18.5, text: "Vos clients voient *tout.*" },
    // 4. CTA
    { start: 18.5, end: 20.5, text: "*Folio.*", size: 120 },
    { start: 20.5, end: 24.0, text: "Essayez *gratuitement.*", final: true },
  ],

  // Moments clés des visuels
  demo: {
    rise: 9.0, // la caption remonte vers le tiers supérieur
    in: 9.1, // le dossier et le panneau en verre apparaissent
    cards: 10.5, // les cartes sortent en éventail (cascade de 100 ms)
    highlight: 12.5, // la carte tarifs passe devant
    press: 15.0, // clic sur le bouton ↗
    spread: 16.5, // l'éventail s'ouvre, zoom doux
    exit: 18.15, // sortie en fondu + flou
  },
  end: {
    logo: 18.6,
    button: 21.0,
  },
};
