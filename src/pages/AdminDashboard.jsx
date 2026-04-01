import React, { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { PremiumCard, PremiumCardHeader, PremiumCardTitle, PremiumCardContent } from "@/components/learning/PremiumCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, Shield, Search, Calendar as CalendarIcon, Users, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
    const adminLogs = useAppStore(s => s.adminLogs);
    const trainings = useAppStore(s => s.trainings);
    const sessions = useAppStore(s => s.sessions);
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState("");

    const filteredLogs = adminLogs.filter(log =>
        log.payloadSummary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
            <div className="flex items-center justify-between bg-primary/5 p-6 rounded-3xl border border-primary/10">
                <div>
                    <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
                        <Shield className="h-8 w-8 text-primary" /> Admin Command Center
                    </h1>
                    <p className="text-muted-foreground mt-2 font-medium">Global activity logs and automated allocation audit.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PremiumCard className="bg-gradient-to-br from-card to-card/50">
                    <PremiumCardContent className="pt-6 flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <Activity className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-4xl font-black tracking-tighter mb-1">{trainings.length}</h3>
                        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Total Programs</p>
                    </PremiumCardContent>
                </PremiumCard>

                <PremiumCard className="bg-gradient-to-br from-card to-card/50">
                    <PremiumCardContent className="pt-6 flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <CalendarIcon className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-4xl font-black tracking-tighter mb-1">{sessions.length}</h3>
                        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Auto-Allocated Sessions</p>
                    </PremiumCardContent>
                </PremiumCard>

                <PremiumCard className="bg-gradient-to-br from-card to-card/50">
                    <PremiumCardContent className="pt-6 flex flex-col items-center text-center">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <Users className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-4xl font-black tracking-tighter mb-1">{adminLogs.length}</h3>
                        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Audit Events</p>
                    </PremiumCardContent>
                </PremiumCard>
            </div>

            <PremiumCard>
                <PremiumCardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border/10 pb-4 gap-4">
                    <PremiumCardTitle className="text-xl flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" /> Platform Activity Logs
                    </PremiumCardTitle>
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search audit trail..."
                            className="pl-9 w-full sm:w-[300px] bg-muted/20 border-border/50"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </PremiumCardHeader>
                <PremiumCardContent className="pt-0 px-0">
                    {filteredLogs.length > 0 ? (
                        <div className="divide-y divide-border/10">
                            {filteredLogs.map(log => (
                                <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors flex items-start gap-4">
                                    <div className="mt-1 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <Activity className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-black uppercase tracking-widest bg-primary text-primary-foreground px-2 py-0.5 rounded-sm">
                                                {log.action}
                                            </span>
                                            <span className="text-sm font-bold text-foreground">by {log.role}</span>
                                            <span className="text-xs text-muted-foreground font-medium">• {format(new Date(log.timestamp), "MMM d, yyyy h:mm a")}</span>
                                        </div>
                                        <p className="text-sm text-foreground/90 leading-relaxed mb-2">
                                            {log.payloadSummary}
                                        </p>
                                        {log.entityId && (
                                            <Button variant="link" className="h-auto p-0 text-xs font-bold text-primary" onClick={() => navigate(`/calendar`)}>
                                                View generated sessions in Calendar <ArrowRight className="h-3 w-3 ml-1" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center text-muted-foreground">
                            <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p className="font-medium">No audit logs found.</p>
                        </div>
                    )}
                </PremiumCardContent>
            </PremiumCard>
        </div>
    );
}
