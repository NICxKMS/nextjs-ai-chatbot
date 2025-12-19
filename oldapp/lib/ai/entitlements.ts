import type { AppUserType } from "@/lib/auth/session";
import { listChatModels } from "./model-registry";

type Entitlements = {
    maxMessagesPerDay: number;
    availableChatModelIds: string[];
};

const getAllModelIds = () => listChatModels().map((model) => model.id);

export const entitlementsByUserType: Record<AppUserType, Entitlements> = {
    /*
     * For users without an account
     */
    guest: {
        maxMessagesPerDay: 20,
        availableChatModelIds: getAllModelIds(),
    },

    /*
     * For users with an account
     */
    regular: {
        maxMessagesPerDay: 100,
        availableChatModelIds: getAllModelIds(),
    },

    /*
     * TODO: For users with an account and a paid membership
     */
};
