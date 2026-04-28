import { CalendarIcon, Search } from "lucide-react";
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
    <div className="surface-shell flex flex-wrap items-end gap-4 p-4 md:p-5 animate-fade-in">
      <div className="min-w-[220px]">
        <label className="section-kicker mb-2 block">
          Date <span className="text-destructive">*</span>
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-11 w-full justify-start text-left font-normal",
                selectedDate && "border-primary/20 bg-primary/[0.08]",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="icon-neutral mr-2 h-4 w-4" />
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

      <div className="min-w-[220px]">
        <label className="section-kicker mb-2 block">Training</label>
        <Select value={selectedTraining} onValueChange={onTrainingChange}>
          <SelectTrigger className={cn("h-11", selectedTraining !== "all" && "border-primary/20 bg-primary/[0.08]")}>
            <SelectValue placeholder="All Trainings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trainings</SelectItem>
            {trainings?.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <div className="flex justify-between items-center w-full min-w-[180px]">
                  <span>{t.title}</span>
                  <span className="ml-2 rounded-[var(--radius-field)] border border-primary/15 bg-primary/[0.08] px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    {getEnrolledCount(t.id)}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[200px] flex-1">
        <label className="section-kicker mb-2 block">Search Student</label>
        <div className="relative">
          <Search className="icon-neutral absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name or ID..."
            className="h-11 pl-9"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
