import { useEffect, useState } from "react";
import { Search, CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

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
    const [dateOpen, setDateOpen] = useState(false);

    const selectedTraining = trainings?.find((t) => t.id === trainingName);

    useEffect(() => {
        setTrainingName(selectedTrainingId || "all");
    }, [selectedTrainingId]);

    useEffect(() => {
        if (selectedDateRange?.from || selectedDateRange?.to) {
            setDateRange(selectedDateRange);
        }
    }, [selectedDateRange]);

    const applyFilters = (nextTrainingName, nextDateRange) => {
        onFilterChange({ training: "", trainingName: nextTrainingName, dateRange: nextDateRange });
    };

    const handleTrainingSelect = (nextTrainingName) => {
        setTrainingName(nextTrainingName);
        setTrainingOpen(false);
        applyFilters(nextTrainingName, dateRange);
    };

    const handleDateRangeSelect = (nextDateRange) => {
        setDateRange(nextDateRange);

        if (nextDateRange?.from && nextDateRange?.to) {
            setDateOpen(false);
            applyFilters(trainingName, nextDateRange);
        }
    };

    return (
        <div className="surface-shell flex flex-wrap items-end gap-4 p-4 md:p-5 animate-fade-in">
            <div className="flex-1 min-w-[300px]">
                <label className="section-kicker mb-2 block">Training</label>
                <Popover open={trainingOpen} onOpenChange={setTrainingOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={trainingOpen}
                            className={cn(
                                "h-11 w-full justify-between font-normal",
                                selectedTraining && selectedTraining.id === trainingName && "border-primary/20 bg-primary/[0.08]"
                            )}
                        >
                            <Search className="icon-neutral mr-2 h-4 w-4 shrink-0" />
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
                                        onSelect={() => handleTrainingSelect("all")}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", trainingName === "all" ? "opacity-100" : "opacity-0")} />
                                        All Trainings
                                    </CommandItem>
                                    {trainings?.map((t) => (
                                        <CommandItem
                                            key={t.id}
                                            value={t.title}
                                            onSelect={() => handleTrainingSelect(t.id)}
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
                <label className="section-kicker mb-2 block">Day Range</label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                "h-11 w-full justify-start text-left font-normal",
                                dateRange?.from && dateRange?.to && "border-primary/20 bg-primary/[0.08]",
                                !dateRange && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="icon-neutral mr-2 h-4 w-4" />
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
                            onSelect={handleDateRangeSelect}
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
        </div>
    );
}
