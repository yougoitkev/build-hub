import React from "react";
import { User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Standardized Avatar component for students and trainers.
 * Uses the specific premium blue palette provided by the user.
 */
export function StudentAvatar({ 
  firstName = "", 
  lastName = "", 
  className,
  iconClassName,
  size = "md" 
}) {
  const initials = (firstName[0] || "") + (lastName[0] || "");
  
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-7 w-7",
  };

  return (
    <Avatar 
      className={cn(
        sizeClasses[size],
        "border shadow-sm shrink-0",
        // Using CSS variables defined in index.css
        "border-[var(--avatar-border)] bg-[var(--avatar-bg)]/40",
        className
      )}
    >
      <div className="flex h-full w-full items-center justify-center">
        <User 
          className={cn(
            iconSizes[size], 
            "text-[var(--avatar-icon)] stroke-[1.5px]", 
            iconClassName
          )} 
        />
      </div>
      <AvatarFallback 
        className="bg-[var(--avatar-bg)] text-[var(--avatar-icon)] font-bold"
      >
        {initials || "U"}
      </AvatarFallback>
    </Avatar>
  );
}
