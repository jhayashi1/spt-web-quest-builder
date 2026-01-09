/** Condition types for quests */
export const CONDITION_TYPES = [
    'CounterCreator', // Elimination tasks
    'FindItem', // Find items in raid
    'HandoverItem', // Hand over items to trader
    'LeaveItemAtLocation', // Leave item at location
    'Level', // Player level requirement
    'Quest', // Complete another quest
    'Skill', // Skill level requirement
    'TraderLoyalty', // Trader loyalty requirement
    'VisitPlace', // Visit a specific location
] as const;

export type ConditionType = typeof CONDITION_TYPES[number];

/** Elimination targets */
export const ELIMINATION_TARGETS = [
    'Any',
    'Savage', // Scavs
    'AnyPmc', // Any PMC
    'Bear',
    'Usec',
    'pmcBot', // Raider
    'exUsec', // Rogues
    'bossBully', // Reshala
    'bossKilla',
    'bossKojaniy', // Shturman
    'bossSanitar',
    'bossGluhar',
    'bossKnight',
    'bossTagilla',
    'bossZryachiy',
    'bossBoar', // Kaban
    'bossKolontay',
    'bossPartisan',
    'sectantPriest',
    'sectantWarrior',
] as const;

export type EliminationTarget = typeof ELIMINATION_TARGETS[number];

/** Body parts for elimination conditions */
export const BODY_PARTS = [
    'Any',
    'Head',
    'Thorax',
    'Stomach',
    'LeftArm',
    'RightArm',
    'LeftLeg',
    'RightLeg',
] as const;

export type BodyPart = typeof BODY_PARTS[number];

/** Compare methods */
export const COMPARE_METHODS = ['>=', '<=', '==', '>', '<'] as const;

export type CompareMethod = typeof COMPARE_METHODS[number];

/** Quest status values */
export const QUEST_STATUSES = [
    {label: 'Locked', value: 1},
    {label: 'Available', value: 2},
    {label: 'Started', value: 3},
    {label: 'Success', value: 4},
    {label: 'Failed', value: 5},
] as const;
