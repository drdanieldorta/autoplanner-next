import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const MobileCardList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-3 md:hidden", className)}
    {...props}
  >
    {children}
  </div>
));
MobileCardList.displayName = "MobileCardList";

const MobileCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <Card
    ref={ref}
    className={cn("bg-card border-border p-4", className)}
    {...props}
  >
    <CardContent className="p-0">
      {children}
    </CardContent>
  </Card>
));
MobileCard.displayName = "MobileCard";

const MobileCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-between mb-3 pb-2 border-b border-border", className)}
    {...props}
  >
    {children}
  </div>
));
MobileCardHeader.displayName = "MobileCardHeader";

const MobileCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold text-foreground", className)}
    {...props}
  >
    {children}
  </h3>
));
MobileCardTitle.displayName = "MobileCardTitle";

const MobileCardBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-2", className)}
    {...props}
  >
    {children}
  </div>
));
MobileCardBody.displayName = "MobileCardBody";

const MobileCardField = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    label: string;
  }
>(({ className, children, label, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex justify-between items-center", className)}
    {...props}
  >
    <span className="text-sm text-muted-foreground">{label}:</span>
    <span className="text-sm font-medium text-foreground">{children}</span>
  </div>
));
MobileCardField.displayName = "MobileCardField";

const MobileCardActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-end gap-2 mt-3 pt-2 border-t border-border", className)}
    {...props}
  >
    {children}
  </div>
));
MobileCardActions.displayName = "MobileCardActions";

export {
  MobileCardList,
  MobileCard,
  MobileCardHeader,
  MobileCardTitle,
  MobileCardBody,
  MobileCardField,
  MobileCardActions,
};