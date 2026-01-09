/** Create default quest messages based on quest ID */
export const createDefaultMessages = (questId: string): {
    acceptPlayerMessage: string;
    changeQuestMessageText: string;
    completePlayerMessage: string;
    declinePlayerMessage: string;
    description: string;
    failMessageText: string;
    name: string;
    note: string;
    startedMessageText: string;
    successMessageText: string;
} => {
    return {
        acceptPlayerMessage   : `${questId} acceptPlayerMessage`,
        changeQuestMessageText: `${questId} changeQuestMessageText`,
        completePlayerMessage : `${questId} completePlayerMessage`,
        declinePlayerMessage  : `${questId} declinePlayerMessage`,
        description           : `${questId} description`,
        failMessageText       : `${questId} failMessageText`,
        name                  : `${questId} name`,
        note                  : `${questId} note`,
        startedMessageText    : `${questId} startedMessageText`,
        successMessageText    : `${questId} successMessageText`,
    };
};

/** Download JSON data as a file */
export const downloadJson = (data: unknown, filename: string): void => {
    const json = JSON.stringify(data, null, 4);
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

/** Generate a MongoDB-style ObjectId */
export const generateId = (): string => {
    const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    const machineId = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    const processId = Math.floor(Math.random() * 65535).toString(16).padStart(4, '0');
    const counter = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    return timestamp + machineId + processId + counter;
};

/** Parse boolean from various string formats */
export const parseBoolean = (val: boolean | string): boolean => {
    if (typeof val === 'boolean') return val;
    const lower = val.toLowerCase();
    if (['1', 'on', 't', 'true', 'y', 'yes'].includes(lower)) return true;
    if (['0', 'f', 'false', 'n', 'no', 'off'].includes(lower)) return false;
    throw new Error(`Invalid boolean value: ${val}`);
};

/** Read a JSON file from file input */
export const readJsonFile = async <T>(file: File): Promise<T> => {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result;
                if (typeof result === 'string') {
                    resolve(JSON.parse(result) as T);
                } else {
                    reject(new Error('Failed to read file as text'));
                }
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
};
