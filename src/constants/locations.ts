/** Available quest locations */
export const LOCATIONS = [
    'any',
    'bigmap', // Customs
    'factory4_day',
    'factory4_night',
    'interchange',
    'laboratory',
    'labyrinth',
    'lighthouse',
    'rezervbase', // Reserve
    'shoreline',
    'tarkovstreets',
    'woods',
    'sandbox', // Ground Zero
    'sandbox_high',
] as const;

export type QuestLocation = typeof LOCATIONS[number];
