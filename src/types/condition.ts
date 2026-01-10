/** Counter structure */
export interface Counter {
    conditions: CounterCondition[];
    id: string;
}

/** Visibility condition for hiding tasks until prerequisites are met */
export interface VisibilityCondition {
    conditionType: 'CompleteCondition';
    id: string;
    target: string; // ID of the condition that must be completed
}

/** Counter condition for kills, exit status, exit name, etc. */
export interface CounterCondition {
    bodyPart?: string[];
    compareMethod?: string;
    conditionType: string;
    daytime?: {from: number; to: number};
    distance?: {compareMethod: string; value: number};
    dynamicLocale?: boolean;
    enemyEquipmentExclusive?: string[];
    enemyEquipmentInclusive?: string[];
    enemyHealthEffects?: unknown[];
    exitName?: string;
    id: string;
    location?: string[];
    resetOnSessionEnd?: boolean;
    savageRole?: string[];
    status?: string[];
    target?: string;
    value?: number;
    weapon?: string[];
    weaponCaliber?: string[];
    weaponModsExclusive?: string[];
    weaponModsInclusive?: string[];
}

/** Base condition interface - extend as needed for specific condition types */
export interface QuestCondition {
    availableAfter?: number;
    compareMethod?: string;
    completeInSeconds?: number;
    conditionType: string;
    counter?: Counter;
    countInRaid?: boolean;
    dogtagLevel?: number;
    doNotResetIfCounterCompleted?: boolean;
    dynamicLocale?: boolean;
    globalQuestCounterId?: string;
    id: string;
    index?: number;
    isEncoded?: boolean;
    isNecessary?: boolean;
    isResetOnConditionFailed?: boolean;
    maxDurability?: number;
    minDurability?: number;
    oneSessionOnly?: boolean;
    onlyFoundInRaid?: boolean;
    parentId?: string;
    plantTime?: number;
    status?: number[];
    target?: string | string[];
    type?: string;
    value?: number;
    visibilityConditions?: VisibilityCondition[];
    zoneId?: string;
}

/** Quest conditions/tasks */
export interface QuestConditions {
    AvailableForFinish: QuestCondition[];
    AvailableForStart: QuestCondition[];
    Fail: QuestCondition[];
}
