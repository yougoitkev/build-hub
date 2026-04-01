import { useState } from "react";
import { CalendarIcon, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export function ObservationFilters({
  selectedDate,
  onDateChange,
  selectedTraining,
  onTrainingChange,
  searchQuery,
  onSearchChange,
  trainings: trainingsProp,
  getEnrolledCount: getEnrolledCountProp,
}) {
  const { trainings: storeTrainings, getEnrolledCount: storeGetEnrolledCount } = useAppStore();
  const trainings = trainingsProp ?? storeTrainings;
  const getEnrolledCount = getEnrolledCountProp ?? storeGetEnrolledCount;

  return (
    <div className="flex flex-wrap gap-4 items-end bg-card p-4 rounded-xl border border-border/50 shadow-sm animate-fade-in">
      {/* Date Picker - Primary */}
      <div className="min-w-[220px]">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
          Date <span className="text-destructive">*</span>
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full h-11 justify-start text-left font-normal border-border/50",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "EEEE, MMM dd, yyyy") : <span>Select observation date...</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onDateChange}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Training */}
      <div className="min-w-[220px]">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Training</label>
        <Select value={selectedTraining} onValueChange={onTrainingChange}>
          <SelectTrigger className="h-11 bg-background">
            <SelectValue placeholder="All Trainings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trainings</SelectItem>
            {trainings?.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <div className="flex justify-between items-center w-full min-w-[180px]">
                  <span>{t.title}</span>
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold ml-2">
                    {getEnrolledCount(t.id)}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Search */}
      <div className="min-w-[200px] flex-1">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Search Student</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID..."
            className="pl-9 h-11"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
