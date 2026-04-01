import React from "react";
import { cn } from "@/lib/utils";

export function ProgressRing({
    progress,
    size = 48,
    strokeWidth = 4,
    className,
    showText = false,
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className={cn("relative inline-flex items-center justify-center", className)}>
            <svg
                width={size}
                height={size}
                className="transform -rotate-90"
            >
                {/* Background ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className="text-secondary"
                />
                {/* Progress ring */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="text-primary transition-all duration-700 ease-in-out"
                />
            </svg>
            {showText && (
                <span className="absolute text-[10px] font-bold text-foreground">
                    {Math.round(progress)}%
                </span>
            )}
        </div>
    );
}
