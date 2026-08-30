import { useEffect } from "react";
import { listenProjectChanged, listenTaskCreated, listenTaskDeleted, listenTaskUpdated, listenWorkLogAdded, } from "@/lib/events";
export function useBoardSync({ onTaskEvent, onProjectChanged, onWorkLogAdded, }) {
    useEffect(() => {
        let cancelled = false;
        const unlisteners = [];
        function register(unlisten) {
            if (cancelled) {
                unlisten();
            }
            else {
                unlisteners.push(unlisten);
            }
        }
        void listenTaskCreated((p) => onTaskEvent("created", p)).then(register);
        void listenTaskUpdated((p) => onTaskEvent("updated", p)).then(register);
        void listenTaskDeleted((p) => onTaskEvent("deleted", p)).then(register);
        void listenProjectChanged(onProjectChanged).then(register);
        if (onWorkLogAdded) {
            void listenWorkLogAdded(onWorkLogAdded).then(register);
        }
        return () => {
            cancelled = true;
            for (const u of unlisteners)
                u();
        };
    }, [onTaskEvent, onProjectChanged, onWorkLogAdded]);
}
