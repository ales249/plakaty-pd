// Brand tokeny Přepište dějiny. Zdroj pravdy: BRAND-RULES.md.
// Rozměry jsou v jednotkách u = px na plátně široké 1080 px.

export const colors = {
  background: '#000000',
  strip: '#FFFFFF',
  textOnStrip: '#000000',
  textOnDark: '#FFFFFF',
} as const;

export const font = {
  family: 'Montserrat',
  /** Vlastní název rodiny: systémově nainstalovaný Montserrat se nikdy nepoužije místo přibaleného */
  stack: "'PD Montserrat', sans-serif",
  /** Photoshop tracking −25 = −0,025 em */
  trackingEm: -0.025,
} as const;

export type FontWeight = 400 | 600 | 700;

export interface TextStyle {
  size: number;
  weight: FontWeight;
}

export const type = {
  headline: { size: 84, weight: 700 },
  kicker: { size: 44, weight: 700 },
  chip: { size: 38, weight: 700 },
  venue: { size: 38, weight: 700 },
  description: { size: 34, weight: 700 },
} as const satisfies Record<string, TextStyle>;

export const strip = {
  /** výška pásky = velikost písma × heightFactor */
  heightFactor: 1.42,
  paddingLeftEm: 0.34,
  paddingRightEm: 0.3,
  /** jemné doladění svislé polohy textu v pásce (kalibrováno na referenci Náchod) */
  baselineShiftEm: -0.04,
  /** mezera mezi páskami pod sebou */
  gap: 11,
  /**
   * Zkosení pásek nadpisu: vodorovné hrany stoupají doprava, svislé zůstávají svislé
   * (PSD Lidice: matice [1, −0,061, 0, 1] = skewY(−3,5°)). Počátek je na levé hraně pásky.
   */
  skewDeg: -3.5,
} as const;

export const chip = {
  height: 50,
  gap: 12,
} as const;

export const layout = {
  marginX: 80,
  /** spodní okraj = boční okraj, logo je od pravého i spodního kraje stejně daleko */
  marginBottom: 80,
  logoSize: 152,
  /** mezera mezi textem místa konání a logem */
  logoClearance: 40,
  /** loga pořadatele: levý horní roh na fotce, stejný okraj jako logo PD; každé se vejde do rámečku */
  partnerLogoBox: { width: 260, height: 70 },
  partnerLogoGap: 40,
} as const;
