// Rapport de contraste WCAG 2.x (US-02c, CA13). Outil de test (décision D2) : il n'est pas
// livré avec l'application, il sert à vérifier les paires de jetons de src/app/theme/tokens.css.
// Formule publique :
// - chaque canal c = v / 255 est linéarisé (sRGB) : c ≤ 0,04045 ? c / 12,92 : ((c + 0,055) / 1,055) ^ 2,4
//   (WCAG 2.0 écrit 0,03928 : aucune différence sur des valeurs de 8 bits) ;
// - luminance relative L = 0,2126 R + 0,7152 G + 0,0722 B ;
// - rapport = (L du plus clair + 0,05) / (L du plus sombre + 0,05), entre 1 et 21, sans arrondi.
// Seules les couleurs #RRGGBB (deux casses) sont acceptées.

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

function linearChannel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  if (!isHexColor(hex)) {
    throw new Error(`Couleur hexadécimale invalide : « ${hex} » (format attendu : #RRGGBB).`);
  }
  const rgb = Number.parseInt(hex.slice(1), 16);
  const red = (rgb >> 16) & 0xff;
  const green = (rgb >> 8) & 0xff;
  const blue = rgb & 0xff;
  return 0.2126 * linearChannel(red) + 0.7152 * linearChannel(green) + 0.0722 * linearChannel(blue);
}

export function contrastRatio(first: string, second: string): number {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}
