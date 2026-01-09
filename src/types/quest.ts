import {type Faction} from '../constants/factions';
import {type QuestLocation} from '../constants/locations';
import {type QuestType} from '../constants/quest-types';
import {type TraderId} from '../constants/traders';
import {type QuestConditions} from './condition';
import {type QuestRewards} from './reward';

/** Main Quest interface */
export interface Quest {
    _id: string;
    acceptPlayerMessage: string;
    canShowNotificationsInGame: boolean;
    changeQuestMessageText: string;
    completePlayerMessage: string;
    conditions: QuestConditions;
    declinePlayerMessage: string;
    description: string;
    failMessageText: string;
    image: string;
    instantComplete: boolean;
    isKey: boolean;
    location: QuestLocation;
    name: string;
    note: string;
    QuestName: string;
    restartable: boolean;
    rewards: QuestRewards;
    secretQuest: boolean;
    side: Faction;
    startedMessageText: string;
    successMessageText: string;
    traderId: TraderId;
    type: QuestType;
}

/** Quest file format (multiple quests keyed by ID) */
export type QuestFile = Record<string, Quest>;

