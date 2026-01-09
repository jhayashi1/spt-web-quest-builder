/** Quest types */
export const QUEST_TYPES = [
    'Completion',
    'Elimination',
    'Exploration',
    'Loyalty',
    'Merchant', // Trader deals
    'PickUp',
    'Standing',
] as const;

export type QuestType = typeof QUEST_TYPES[number];
