/** Reward timing options */
export const REWARD_TIMINGS = ['Success', 'Started', 'Fail'] as const;

export type RewardTiming = typeof REWARD_TIMINGS[number];

/** Skills for skill rewards */
export const SKILLS = [
    'Attention',
    'Charisma',
    'Covert Movement',
    'Endurance',
    'Health',
    'Hideout Management',
    'Immunity',
    'Intellect',
    'Light Vests',
    'Mag Drills',
    'Memory',
    'Metabolism',
    'Perception',
    'Pistols',
    'Recoil Control',
    'Revolver',
    'Search',
    'Shotguns',
    'SMG',
    'Sniper Rifles',
    'Strength',
    'Stress Resistance',
    'Surgery',
    'Throwables',
    'Troubleshooting',
    'Vitality',
] as const;

export type Skill = typeof SKILLS[number];
