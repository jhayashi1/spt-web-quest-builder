import {type RewardType} from '../constants/reward-types';
import {type TraderId} from '../constants/traders';
import {type ItemData} from './item';

export interface AchievementReward extends BaseReward {
    target: string; // Achievement ID
    type: 'Achievement';
}

export interface AssortmentUnlockReward extends BaseReward {
    items: ItemData[];
    loyaltyLevel: number;
    target: string;
    traderId: TraderId;
    type: 'AssortmentUnlock';
}

/** Base reward interface */
export interface BaseReward {
    availableInGameEditions: string[];
    id: string;
    index: number;
    type: RewardType;
    unknown: boolean;
}

export interface ExperienceReward extends BaseReward {
    type: 'Experience';
    value: number;
}

export interface ItemReward extends BaseReward {
    findInRaid: boolean;
    items: ItemData[];
    target: string;
    type: 'Item';
    value: number;
}

/** Quest rewards by timing */
export interface QuestRewards {
    Fail: Reward[];
    Started: Reward[];
    Success: Reward[];
}

export type Reward =
    | AchievementReward
    | AssortmentUnlockReward
    | ExperienceReward
    | ItemReward
    | SkillReward
    | StashRowsReward
    | TraderStandingReward
    | TraderUnlockReward;

export interface SkillReward extends BaseReward {
    target: string; // Skill name
    type: 'Skill';
    value: number;
}

export interface StashRowsReward extends BaseReward {
    type: 'StashRows';
    value: number;
}

export interface TraderStandingReward extends BaseReward {
    target: TraderId;
    type: 'TraderStanding';
    value: number;
}

export interface TraderUnlockReward extends BaseReward {
    target: TraderId;
    type: 'TraderUnlock';
}
