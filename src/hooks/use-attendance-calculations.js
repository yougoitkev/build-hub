import { useMemo } from "react";
import { TOTAL_DAYS } from "@/lib/tier-config";

export function useAttendanceCalculations(dayValues) {
    return useMemo(() => {
        let totalAbsences = 0;
        let earlyLate = 0;
        let ncnsCount = 0;
        let hoursCompleted = 0;

        for (let d = 1; d <= TOTAL_DAYS; d++) {
            const val = dayValues[`day_${d}`];
            if (val === undefined || val === null || val === "") continue;

            const str = String(val).trim().toUpperCase();
            if (str === "NCNS") {
                ncnsCount++;
            } else {
                const num = parseFloat(str);
                if (!isNaN(num)) {
                    if (num === 0) totalAbsences++;
                    else if (num > 0 && num < 8) earlyLate++;
                    hoursCompleted += num;
                }
            }
        }

        return { totalAbsences, earlyLate, ncnsCount, hoursCompleted };
    }, [dayValues]);
}
