/** Player factions */
export const FACTIONS = ['pmc', 'scav', 'any'] as const;

export type Faction = typeof FACTIONS[number];
