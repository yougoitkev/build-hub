import React from "react";
import { cn } from "@/lib/utils";
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardDescription, PremiumCardContent, PremiumCardFooter } from "./PremiumCard";
import { ProgressRing } from "./ProgressRing";
import { Button } from "@/components/ui/button";
import { ChevronRight, Users, Calendar } from "lucide-react";

export function CourseCard({
    title,
    description,
    progress,
    studentsCount,
    nextSession,
    className,
    onClick,
}) {
    return (
        <PremiumCard className={cn("flex flex-col h-full", className)} onClick={onClick}>
            <PremiumCardHeader className="flex flex-row items-start justify-between">
                <div className="space-y-1">
                    <PremiumCardTitle>{title}</PremiumCardTitle>
                    <PremiumCardDescription>{description}</PremiumCardDescription>
                </div>
                <ProgressRing progress={progress} size={40} showText />
            </PremiumCardHeader>
            <PremiumCardContent className="flex-1">
                <div className="flex flex-col gap-3 mt-4">
                    {studentsCount !== undefined && (
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Users className="h-4 w-4 mr-2" />
                            <span>{studentsCount} Students Enrolled</span>
                        </div>
                    )}
                    {nextSession && (
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>Next: {nextSession}</span>
                        </div>
                    )}
                </div>
            </PremiumCardContent>
            <PremiumCardFooter>
                <Button variant="ghost" className="w-full justify-between hover:bg-primary/5 hover:text-primary group/btn">
                    <span>{progress > 0 ? "Resume Module" : "Start Module"}</span>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                </Button>
            </PremiumCardFooter>
        </PremiumCard>
    );
}
