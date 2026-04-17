import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export function PremiumCard({
    children,
    className,
    hoverable = true,
    ...props
}) {
    return (
        <Card
            className={cn(
                "group rounded-3xl border-border/40 bg-card/60 backdrop-blur-xl",
                "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.06)] transition-all duration-500",
                hoverable && "hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.12)] hover:border-border/70 hover:-translate-y-0.5",
                className
            )}
            {...props}
        >
            {children}
        </Card>
    );
}

export function PremiumCardHeader({ children, className, ...props }) {
    return <CardHeader className={cn("pb-2", className)} {...props}>{children}</CardHeader>;
}

export function PremiumCardTitle({ children, className, ...props }) {
    return <CardTitle className={cn("text-xl font-bold tracking-tight", className)} {...props}>{children}</CardTitle>;
}

export function PremiumCardDescription({ children, className, ...props }) {
    return <CardDescription className={cn("text-sm text-muted-foreground/80 leading-relaxed", className)} {...props}>{children}</CardDescription>;
}

export function PremiumCardContent({ children, className, ...props }) {
    return <CardContent className={cn("pt-4", className)} {...props}>{children}</CardContent>;
}

export function PremiumCardFooter({ children, className, ...props }) {
    return <CardFooter className={cn("pt-4 border-t border-border/40", className)} {...props}>{children}</CardFooter>;
}
