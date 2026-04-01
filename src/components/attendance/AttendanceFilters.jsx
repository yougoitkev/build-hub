import { useEffect, useState } from "react";
import { Search, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown } from "lucide-react";

export function AttendanceFilters({
    onFilterChange,
    trainings: trainingsProp,
    getEnrolledCount: getEnrolledCountProp,
    selectedTrainingId = "all",
    selectedDateRange,
    availableDateRange,
}) {
    const { trainings: storeTrainings, getEnrolledCount: storeGetEnrolledCount } = useAppStore();
    const trainings = trainingsProp ?? storeTrainings;
    const getEnrolledCount = getEnrolledCountProp ?? storeGetEnrolledCount;
    const [trainingName, setTrainingName] = useState(selectedTrainingId || "all");
    const [dateRange, setDateRange] = useState(selectedDateRange || { from: new Date(), to: new Date() });
    const [trainingOpen, setTrainingOpen] = useState(false);

    const selectedTraining = trainings?.find(t => t.id === trainingName);

    useEffect(() => {
        setTrainingName(selectedTrainingId || "all");
    }, [selectedTrainingId]);

    useEffect(() => {
        if (selectedDateRange?.from || selectedDateRange?.to) {
            setDateRange(selectedDateRange);
        }
    }, [selectedDateRange]);

    const handleApply = () => {
        onFilterChange({ training: "", trainingName, dateRange });
    };

    return (
        <div className="flex flex-wrap gap-4 items-end bg-card p-4 rounded-xl border border-border/50 shadow-sm animate-fade-in">
            <div className="flex-1 min-w-[300px]">
                <Popover open={trainingOpen} onOpenChange={setTrainingOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={trainingOpen}
                            className="w-full h-11 justify-between font-normal bg-background"
                        >
                            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                            {selectedTraining ? selectedTraining.title : "Search & select training..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                            <CommandInput placeholder="Type to search trainings..." />
                            <CommandList>
                                <CommandEmpty>No training found.</CommandEmpty>
                                <CommandGroup>
                                    <CommandItem
                                        value="all"
                                        onSelect={() => { setTrainingName("all"); setTrainingOpen(false); }}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", trainingName === "all" ? "opacity-100" : "opacity-0")} />
                                        All Trainings
                                    </CommandItem>
                                    {trainings?.map((t) => (
                                        <CommandItem
                                            key={t.id}
                                            value={t.title}
                                            onSelect={() => { setTrainingName(t.id); setTrainingOpen(false); }}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", trainingName === t.id ? "opacity-100" : "opacity-0")} />
                                            <span className="flex-1 truncate">{t.title}</span>
                                            <Badge variant="secondary" className="ml-2 text-[10px] font-bold">
                                                {getEnrolledCount(t.id)}
                                            </Badge>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="w-[300px]">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Day Range</label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                "w-full h-11 justify-start text-left font-normal border-border/50",
                                !dateRange && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(dateRange.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date range</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                            disabled={(date) => {
                                if (!availableDateRange?.from || !availableDateRange?.to) {
                                    return false;
                                }

                                const current = startOfDay(date);
                                const from = startOfDay(availableDateRange.from);
                                const to = startOfDay(availableDateRange.to);
                                return current < from || current > to;
                            }}
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <Button onClick={handleApply} className="h-11 px-8 rounded-lg shadow-lg shadow-primary/20">
                Apply Filters
            </Button>
        </div>
    );
}
