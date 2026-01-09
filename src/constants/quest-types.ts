/** Quest types */
export const QUEST_TYPES = [
    'Completion',
    'Discover',
    'Elimination',
    'Exploration',
    'Loyalty',
    'Merchant', // Trader deals
    'Multi',
    'PickUp',
    'Skill',
    'Standing',
    'WeaponAssembly',
] as const;

export type QuestType = typeof QUEST_TYPES[number];
