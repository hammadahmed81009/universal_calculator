import { getData, saveData } from './storage';
const getUserStorageKey = (userId: string, dataType: string) => `user_${userId}_${dataType}`;
export const getUserData = <T>(userId: string, dataType: string, defaultValue?: T): T => (defaultValue as T) ?? (getData<T>(getUserStorageKey(userId, dataType)) as T);
export const saveUserData = <T>(userId: string, dataType: string, data: T): void => { saveData(getUserStorageKey(userId, dataType), data); };
export const getCurrentUserData = <T>(currentUserId: string | undefined, dataType: string, defaultValue?: T): T => (!currentUserId ? (defaultValue as T) : getUserData(currentUserId, dataType, defaultValue)) as T;
export const saveCurrentUserData = <T>(currentUserId: string | undefined, dataType: string, data: T): void => { if (currentUserId) saveUserData(currentUserId, dataType, data); };
