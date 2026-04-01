import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/learning/PremiumCard";
import { ProgressRing } from "@/components/learning/ProgressRing";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlayCircle, BookOpen, Calendar, Users, FileText, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/data/api";
import { toast } from "sonner";

export default function CourseDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [fetchError, setFetchError] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadCourse = async () => {
            try {
                if (isMounted) {
                    setIsLoadingData(true);
                    setFetchError(false);
                }

                const response = await api.courseDetail.detail(id);

                if (!isMounted) {
                    return;
                }

                setCourse({
                    id: String(response?.id || id),
                    title: response?.title || "Course",
                    description: response?.description || "",
                    progress: Number(response?.progress || 0),
                    modules: Array.isArray(response?.modules) ? response.modules : [],
                    nextSession: response?.next_session || null,
                });
            } catch (error) {
                if (isMounted) {
                    setCourse(null);
                    setFetchError(true);
                }
                toast.error(error?.message || "Failed to load course details.");
            } finally {
                if (isMounted) {
                    setIsLoadingData(false);
                }
            }
        };

        loadCourse();

        return () => {
            isMounted = false;
        };
    }, [id]);

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-700">
            <Button variant="ghost" className="mb-4 text-muted-foreground hover:text-foreground pl-0 group" onClick={() => navigate("/")}>
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Learning Hub
            </Button>

            {isLoadingData && <p className="text-sm text-muted-foreground">Loading data...</p>}
            {!isLoadingData && fetchError && <p className="text-sm text-destructive">Error in fetching data</p>}
            {!isLoadingData && !fetchError && course && (
                <>

            {/* Course Hero */}
            <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-8 md:p-12 mb-8">
                <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between relative z-10">
                    <div className="max-w-2xl">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
                            Active Cohort
                        </span>
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
                            {course.title}
                        </h1>
                        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                            {course.description}
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button className="rounded-full px-8 bg-primary hover:bg-primary/90">
                                Resume Learning
                            </Button>
                            <Button variant="outline" className="rounded-full px-6">
                                View Roster
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-col items-center bg-background/50 p-6 rounded-2xl border border-border/50 backdrop-blur-sm">
                        <ProgressRing progress={course.progress} size={120} strokeWidth={8} showText className="mb-4 scale-125" />
                        <p className="text-sm font-semibold text-muted-foreground mt-4">Course Progress</p>
                    </div>
                </div>
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Module List */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-bold tracking-tight mb-4">Curriculum</h2>
                    <div className="space-y-4">
                        {course.modules.map((module, index) => (
                            <PremiumCard key={module.id} className={`transition-all ${module.status === 'locked' ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                                <div className="flex items-center p-5 gap-4">
                                    <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${module.status === 'completed' ? 'bg-status-completed/10 text-status-completed' :
                                            module.status === 'in-progress' ? 'bg-primary/10 text-primary' :
                                                'bg-muted text-muted-foreground'
                                        }`}>
                                        {module.status === 'completed' ? <CheckCircle2 className="h-6 w-6" /> :
                                            module.type === 'Video' ? <PlayCircle className="h-6 w-6" /> :
                                                module.type === 'Article' ? <FileText className="h-6 w-6" /> :
                                                    <BookOpen className="h-6 w-6" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Module {index + 1}</p>
                                        <h3 className="text-lg font-bold text-foreground truncate">{module.title}</h3>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                            <span className="flex items-center"><Calendar className="mr-1 h-3 w-3" /> {module.duration}</span>
                                            <span>·</span>
                                            <span>{module.type}</span>
                                        </div>
                                    </div>
                                    <div>
                                        {module.status === 'completed' ? (
                                            <span className="text-sm font-bold text-status-completed">Completed</span>
                                        ) : module.status === 'in-progress' ? (
                                            <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">Resume</Button>
                                        ) : (
                                            <StatusBadge status="Locked" />
                                        )}
                                    </div>
                                </div>
                            </PremiumCard>
                        ))}
                    </div>
                </div>

                {/* Sidebar details */}
                <div className="space-y-6">
                        <PremiumCard className="bg-primary/5 border-primary/10">
                            <PremiumCardHeader>
                                <PremiumCardTitle className="text-lg flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-primary" /> Upcoming Session
                                </PremiumCardTitle>
                            </PremiumCardHeader>
                            <PremiumCardContent>
                                <div className="space-y-4">
                                    <div>
                                    <p className="font-bold text-foreground">{course.nextSession?.title || "No upcoming session"}</p>
                                    <p className="text-sm text-muted-foreground">{course.nextSession?.time || "-"}</p>
                                    </div>
                                    <div className="text-sm">
                                    <p className="text-muted-foreground">Trainer: <span className="font-medium text-foreground">{course.nextSession?.trainer || "-"}</span></p>
                                    <p className="text-muted-foreground">Location: <span className="font-medium text-foreground">{course.nextSession?.location || "-"}</span></p>
                                    </div>
                                    <div className="pt-2 flex gap-2">
                                        <Button className="w-full bg-primary hover:bg-primary/90">Join Session</Button>
                                </div>
                            </div>
                        </PremiumCardContent>
                    </PremiumCard>

                    <PremiumCard>
                        <PremiumCardHeader>
                            <PremiumCardTitle className="text-lg flex items-center gap-2">
                                <Users className="h-5 w-5" /> Quick Actions
                            </PremiumCardTitle>
                        </PremiumCardHeader>
                        <PremiumCardContent className="space-y-2">
                            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/attendance')}>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Attendance
                            </Button>
                            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/observations')}>
                                <FileText className="mr-2 h-4 w-4" /> Add Observation
                            </Button>
                        </PremiumCardContent>
                    </PremiumCard>
                </div>
            </div>
                </>
            )}
        </div>
    );
}
