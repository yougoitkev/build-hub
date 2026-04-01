import { useState } from "react";
import { TIER_CONFIG, computeTierTotal } from "@/lib/tier-config";
import { HoursDropdown } from "./HoursDropdown";
import { OverrideModal } from "./OverrideModal";
import { StudentSummaryCard } from "./StudentSummaryCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TierAttendanceView({ studentName, dayValues, overrides = {}, importId, rowNumber, onOverride, readOnly = false }) {
  const [expandedTiers, setExpandedTiers] = useState({});
  const [overrideModal, setOverrideModal] = useState(null);

  const toggleTier = (tierId) => {
    setExpandedTiers((prev) => ({ ...prev, [tierId]: !prev[tierId] }));
  };

  const handleCellClick = (dayNum) => {
    if (readOnly) return;
    const key = `day_${dayNum}`;
    setOverrideModal({
      dayNum,
      currentValue: dayValues[key],
      dayLabel: `Day ${dayNum}`,
    });
  };

  const handleOverrideConfirm = (newValue, reason) => {
    if (overrideModal && onOverride) {
      onOverride(`day_${overrideModal.dayNum}`, newValue, reason);
    }
    setOverrideModal(null);
  };

  return (
    <div className="space-y-3">
      <StudentSummaryCard dayValues={dayValues} />

      <div className="space-y-1">
        {TIER_CONFIG.map((tier) => {
          const isOpen = expandedTiers[tier.id] ?? false;
          const tierTotal = computeTierTotal(dayValues, tier.days);
          const maxHours = tier.days.length * 8;
          const pct = Math.round((tierTotal / maxHours) * 100);

          return (
            <Collapsible key={tier.id} open={isOpen} onOpenChange={() => toggleTier(tier.id)}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted/50 transition-colors group text-left">
                <div className="flex items-center gap-2">
                  <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                  <span className="text-sm font-semibold text-foreground">{tier.label}</span>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {tier.days.length} days
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-mono font-bold text-foreground w-16 text-right">{tierTotal}/{maxHours}h</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-wrap gap-2 p-3 pl-9 pb-4">
                  {tier.days.map((dayNum) => {
                    const key = `day_${dayNum}`;
                    const hasOverride = !!overrides[key];
                    return (
                      <div key={dayNum} className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground font-medium">D{dayNum}</span>
                        <div
                          onClick={() => handleCellClick(dayNum)}
                          className={cn("cursor-pointer", readOnly && "cursor-default")}
                        >
                          <HoursDropdown
                            value={dayValues[key]}
                            onChange={(val) => {
                              if (!readOnly) handleCellClick(dayNum);
                            }}
                            disabled={true}
                            provenance={importId ? { importId, rowNumber } : null}
                            hasOverride={hasOverride}
                          />
                        </div>
                        {hasOverride && (
                          <Shield className="h-3 w-3 text-accent" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {overrideModal && (
        <OverrideModal
          open={!!overrideModal}
          onOpenChange={(open) => !open && setOverrideModal(null)}
          currentValue={overrideModal.currentValue}
          studentName={studentName}
          dayLabel={overrideModal.dayLabel}
          onConfirm={handleOverrideConfirm}
        />
      )}
    </div>
  );
}
