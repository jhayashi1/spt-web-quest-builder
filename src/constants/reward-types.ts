/** Reward types */
export const REWARD_TYPES = [
    'Achievement',
    'AssortmentUnlock',
    'Experience',
    'Item',
    'Skill',
    'StashRows',
    'TraderStanding',
    'TraderUnlock',
] as const;

export type RewardType = typeof REWARD_TYPES[number];
