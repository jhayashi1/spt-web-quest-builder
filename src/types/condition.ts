/** Base condition interface - extend as needed for specific condition types */
export interface QuestCondition {
    [key: string]: unknown;
    conditionType: string;
    id: string;
}

/** Quest conditions/tasks */
export interface QuestConditions {
    AvailableForFinish: QuestCondition[];
    AvailableForStart: QuestCondition[];
    Fail: QuestCondition[];
}
